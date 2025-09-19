import React, { useState, useEffect } from 'react'
import { Download, Database, AlertCircle, CheckCircle, Users, Building, RefreshCw, Trash2, Eye, X } from 'lucide-react'
import { idloomApi, IDLoomEvent } from '../../services/idloomApi'
import { useRawIDLoomData } from '../../hooks/useRawIDLoomData'
import { useAttendees } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'

interface IDLoomInitialMigrationProps {
  onCancel: () => void
}

export default function IDLoomInitialMigration({ onCancel }: IDLoomInitialMigrationProps) {
  const [step, setStep] = useState<'connection' | 'events' | 'migration' | 'cleanup'>('connection')
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState<string>('')
  const [events, setEvents] = useState<IDLoomEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<IDLoomEvent | null>(null)
  const [migrationProgress, setMigrationProgress] = useState<{
    phase: string
    current: number
    total: number
    message: string
  }>({ phase: 'idle', current: 0, total: 0, message: '' })
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCleanupOptions, setShowCleanupOptions] = useState(false)

  const { bulkInsertRawData } = useRawIDLoomData()
  const { attendees, refreshAttendees } = useAttendees()

  // Test IDLoom connection
  const testConnection = async () => {
    setConnectionStatus('testing')
    setConnectionError('')
    
    try {
      const result = await idloomApi.testConnection()
      
      if (result.success) {
        setConnectionStatus('success')
        setStep('events')
        await loadEvents()
      } else {
        setConnectionStatus('error')
        setConnectionError(result.message || result.error || 'Connection test failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError(error instanceof Error ? error.message : 'Unknown connection error')
    }
  }

  // Load available events
  const loadEvents = async () => {
    setIsLoading(true)
    try {
      const result = await idloomApi.getEvents(1, 50)
      
      if (result.success && result.data) {
        setEvents(Array.isArray(result.data) ? result.data : [result.data])
      } else {
        throw new Error(result.error || 'Failed to load events')
      }
    } catch (error) {
      console.error('Error loading events:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  // Perform initial migration
  const performInitialMigration = async (event: IDLoomEvent) => {
    setSelectedEvent(event)
    setStep('migration')
    setIsLoading(true)
    
    try {
      // Phase 1: Load all guests from IDLoom
      setMigrationProgress({
        phase: 'loading',
        current: 0,
        total: event.guest_count || 0,
        message: 'Loading all guests from IDLoom...'
      })

      const result = await idloomApi.getAllEventGuests(
        event.uid,
        'Complete', // Only get completed registrations
        undefined, // No date filter for initial migration
        (current, total) => {
          setMigrationProgress(prev => ({
            ...prev,
            current,
            total,
            message: `Loading page ${current} of ${total}...`
          }))
        }
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load guests from IDLoom')
      }

      const allGuests = Array.isArray(result.data) ? result.data : [result.data]
      
      // Phase 2: Store raw data
      setMigrationProgress({
        phase: 'storing',
        current: 0,
        total: allGuests.length,
        message: 'Storing raw guest data...'
      })

      const batchId = await bulkInsertRawData(
        event.uid,
        event.name,
        allGuests,
        `initial-migration-${Date.now()}`
      )

      // Phase 3: Migration complete
      setMigrationProgress({
        phase: 'complete',
        current: allGuests.length,
        total: allGuests.length,
        message: 'Initial migration completed successfully!'
      })

      setMigrationResults({
        eventName: event.name,
        eventUid: event.uid,
        totalGuests: allGuests.length,
        batchId,
        completedAt: new Date().toISOString(),
        nextSteps: [
          'Review imported data in IDLoom Review Panel',
          'Approve and import attendees',
          'Clean up old attendee data if needed'
        ]
      })

    } catch (error) {
      console.error('Migration error:', error)
      setConnectionError(error instanceof Error ? error.message : 'Migration failed')
      setMigrationProgress({
        phase: 'error',
        current: 0,
        total: 0,
        message: 'Migration failed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Clean up existing attendee data
  const cleanupExistingData = async () => {
    if (!confirm(`⚠️ WARNING: This will DELETE ALL ${attendees.length} existing attendee records!\n\nThis action cannot be undone. Are you absolutely sure you want to proceed?\n\nType "DELETE ALL" in the next prompt to confirm.`)) {
      return
    }

    const confirmation = prompt('Type "DELETE ALL" to confirm deletion of all attendee records:')
    if (confirmation !== 'DELETE ALL') {
      alert('Deletion cancelled - confirmation text did not match.')
      return
    }

    try {
      setIsLoading(true)
      setMigrationProgress({
        phase: 'cleanup',
        current: 0,
        total: attendees.length,
        message: 'Deleting existing attendee records...'
      })

      // Delete all attendees (this will cascade to related records)
      const { error } = await supabase
        .from('attendees')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

      if (error) {
        throw new Error(`Failed to delete attendees: ${error.message}`)
      }

      await refreshAttendees()
      
      setMigrationProgress({
        phase: 'cleanup-complete',
        current: attendees.length,
        total: attendees.length,
        message: 'Cleanup completed successfully!'
      })

      alert('✅ All existing attendee records have been deleted. You can now proceed with the IDLoom migration.')
      setShowCleanupOptions(false)

    } catch (error) {
      console.error('Cleanup error:', error)
      alert(`❌ Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Connection Step
  if (step === 'connection') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              IDLoom Initial Data Migration
            </h1>
            <p className="text-brand-gray">
              One-time migration to import all current IDLoom registrations
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Warning about data replacement */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-800">
                Initial Data Migration Process
              </h3>
            </div>
            <div className="space-y-3 text-sm text-yellow-800">
              <p><strong>This tool will:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Connect to your IDLoom account and fetch ALL current registrations</li>
                <li>Store the raw data in your database for review</li>
                <li>Allow you to review and approve each attendee before importing</li>
                <li>Create properly structured attendee records with correct attributes</li>
                <li>Handle spouse/partner records automatically</li>
              </ul>
              <p className="mt-4"><strong>Recommended workflow:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Backup your current attendee data (export to CSV)</li>
                <li>Run this initial migration to import IDLoom data</li>
                <li>Review and approve attendees in the IDLoom Review Panel</li>
                <li>Optionally clean up old attendee data once satisfied</li>
              </ol>
            </div>
          </div>

          {/* Current attendee data status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-navy">
                Current Database Status
              </h3>
              <button
                onClick={() => setShowCleanupOptions(!showCleanupOptions)}
                className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Cleanup Options
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{attendees.length}</div>
                <div className="text-sm text-blue-800">Current Attendees</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {attendees.filter(a => a.registrationStatus === 'confirmed').length}
                </div>
                <div className="text-sm text-green-800">Confirmed</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {attendees.filter(a => a.isSpouse || a.is_spouse).length}
                </div>
                <div className="text-sm text-purple-800">Spouses</div>
              </div>
            </div>

            {showCleanupOptions && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-red-800 mb-3">⚠️ Data Cleanup Options</h4>
                <p className="text-sm text-red-700 mb-4">
                  If you want to start fresh with IDLoom data, you can delete all existing attendee records. 
                  <strong> This action cannot be undone!</strong>
                </p>
                <button
                  onClick={cleanupExistingData}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Existing Attendees ({attendees.length})
                </button>
              </div>
            )}
          </div>

          {/* Connection test */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <Database className="w-16 h-16 text-brand-navy mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-2">
                Connect to IDLoom API
              </h3>
              <p className="text-brand-gray mb-6">
                Test your IDLoom API connection and load available events
              </p>

              {connectionError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 text-sm">{connectionError}</p>
                  </div>
                </div>
              )}

              <button
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionStatus === 'testing' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Test Connection & Load Events
                  </>
                )}
              </button>

              {connectionStatus === 'success' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-800 text-sm">Connection successful! Loading events...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Events Selection Step
  if (step === 'events') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Select IDLoom Event for Migration
            </h1>
            <p className="text-brand-gray">
              Choose the event to migrate all current registrations from
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {events.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <div
                  key={event.uid}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-brand-navy">
                        {event.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-brand-gray mt-1">
                        <span>Event UID: {event.uid}</span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {event.guest_count || 0} guests
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'published' ? 'bg-green-100 text-green-800' :
                          event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      {event.start_date && (
                        <div className="text-sm text-brand-gray mt-1">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-sm text-brand-gray mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => performInitialMigration(event)}
                      disabled={isLoading}
                      className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Migrate All Guests
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-brand-gray">No events found in your IDLoom account.</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Migration Process:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Complete Data Pull:</strong> Downloads ALL current registrations from the selected event</li>
            <li>• <strong>Raw Data Storage:</strong> Stores original IDLoom data for review and audit trail</li>
            <li>• <strong>No Automatic Import:</strong> Data goes to review queue, not directly to attendees table</li>
            <li>• <strong>Batch Processing:</strong> All data is grouped in a single migration batch</li>
            <li>• <strong>Review Required:</strong> Use IDLoom Review Panel to approve each attendee</li>
          </ul>
        </div>
      </div>
    )
  }

  // Migration Progress Step
  if (step === 'migration') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Migration in Progress: {selectedEvent?.name}
            </h1>
            <p className="text-brand-gray">
              Importing all current registrations from IDLoom
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Progress Display */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-4 mb-4">
              {migrationProgress.phase === 'complete' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : migrationProgress.phase === 'error' ? (
                <AlertCircle className="w-8 h-8 text-red-600" />
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-brand-navy">
                  {migrationProgress.message}
                </h3>
                <p className="text-brand-gray text-sm">
                  {migrationProgress.current} of {migrationProgress.total} processed
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {migrationProgress.total > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-brand-navy h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                ></div>
              </div>
            )}

            {/* Phase Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-3 rounded-lg text-center ${
                migrationProgress.phase === 'loading' ? 'bg-blue-100 text-blue-800' :
                migrationProgress.current > 0 ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                <div className="font-semibold">Phase 1</div>
                <div className="text-sm">Loading from IDLoom</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${
                migrationProgress.phase === 'storing' ? 'bg-blue-100 text-blue-800' :
                migrationProgress.phase === 'complete' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                <div className="font-semibold">Phase 2</div>
                <div className="text-sm">Storing Raw Data</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${
                migrationProgress.phase === 'complete' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                <div className="font-semibold">Phase 3</div>
                <div className="text-sm">Ready for Review</div>
              </div>
            </div>
          </div>

          {/* Migration Results */}
          {migrationResults && (
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-600">
                  Migration Completed Successfully!
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-semibold text-brand-navy mb-3">Migration Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Event:</span>
                      <span className="font-semibold">{migrationResults.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Guests:</span>
                      <span className="font-semibold text-green-600">{migrationResults.totalGuests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Batch ID:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{migrationResults.batchId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-semibold">{new Date(migrationResults.completedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold text-brand-navy mb-3">Next Steps</h4>
                  <ol className="text-sm text-brand-gray space-y-2">
                    {migrationResults.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="font-semibold text-brand-navy">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={() => window.location.href = '/idloom-review'}
                  className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Go to IDLoom Review Panel
                </button>
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {connectionError && migrationProgress.phase === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-600">Migration Failed</h3>
              </div>
              <p className="text-red-800 text-sm">{connectionError}</p>
              <button
                onClick={() => setStep('events')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}