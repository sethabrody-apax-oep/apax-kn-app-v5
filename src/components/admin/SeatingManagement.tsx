import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Users, Calendar, Utensils, Settings, Clock, MapPin, AlertCircle, CheckCircle, Eye, Grid3X3 } from 'lucide-react'
import SeatingManager from '../seating/SeatingManager'
import { useEventsWithSeating } from '../../hooks/useSeatingData'

export default function SeatingManagement() {
  console.log('SeatingManagement: Rendering')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'manage' | 'configure'>('manage')
  const stableKeyRef = useRef(0)
  
  const { events, loading, error, refreshEvents } = useEventsWithSeating()
  
  // Create completely stable event details that only change when event ID changes
  const selectedEventDetails = useMemo(() => {
    if (!selectedEventId) return null
    
    const event = events.find(e => e.id === selectedEventId)
    if (!event) return null
    
    return {
      id: event.id,
      type: event.type,
      name: event.name,
      capacity: event.capacity,
      mode: selectedMode,
      stableKey: stableKeyRef.current
    }
  }, [selectedEventId, selectedMode, events])

  const handleManageSeating = useCallback((event: any) => {
    if (selectedEventId !== event.id || selectedMode !== 'manage') {
      stableKeyRef.current += 1 // Force new key only when actually changing
      setSelectedEventId(event.id)
      setSelectedMode('manage')
    }
  }, [selectedEventId, selectedMode])

  const handleConfigureSeating = useCallback((event: any) => {
    if (selectedEventId !== event.id || selectedMode !== 'configure') {
      stableKeyRef.current += 1 // Force new key only when actually changing
      setSelectedEventId(event.id)
      setSelectedMode('configure')
    }
  }, [selectedEventId, selectedMode])

  const handleCloseSeating = useCallback(() => {
    setSelectedEventId(null)
    setSelectedMode('manage')
    // Refresh events to get updated configuration status
    refreshEvents()
  }, [refreshEvents])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'configured': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />
      case 'configured': return <Settings className="w-4 h-4" />
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'archived': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Waiting for Configuration'
      case 'configured': return 'Configured'
      case 'active': return 'Active'
      case 'archived': return 'Archived'
      default: return 'Unknown'
    }
  }

  const getActionText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Configure Seating'
      case 'configured': return 'Manage Seating'
      case 'active': return 'Manage Seating'
      case 'archived': return 'View Seating'
      default: return 'Configure'
    }
  }

  const hasConfiguration = useCallback((event: any) => {
    return event.seatingConfig && event.status !== 'waiting'
  }, [])
  
  if (selectedEventDetails) {
    return (
      <SeatingManager
        key={selectedEventDetails.stableKey}
        eventId={selectedEventDetails.id}
        eventType={selectedEventDetails.type}
        eventName={selectedEventDetails.name}
        eventCapacity={selectedEventDetails.capacity}
        mode={selectedEventDetails.mode}
        onClose={handleCloseSeating}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        <span className="ml-3 text-brand-navy">Loading events with seating...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading events: {error}</p>
        <button 
          onClick={refreshEvents}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy mb-2">
          Seating Management
        </h1>
        <p className="text-brand-gray">
          Manage seating assignments for events with assigned seating
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Users className="w-12 h-12 text-brand-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            No Events with Assigned Seating
          </h3>
          <p className="text-brand-gray mb-4">
            Events will automatically appear here when you set their seating type to "Assigned Seating" in Agenda or Dining management.
          </p>
          <div className="text-sm text-brand-gray">
            <p>To create events with seating:</p>
            <p>1. Go to Agenda Management or Dining Management</p>
            <p>2. Create or edit an event</p>
            <p>3. Select "Assigned Seating" in the seating configuration section</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={`${event.type}-${event.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      {event.type === 'agenda' ? (
                        <Calendar className="w-5 h-5 text-brand-navy" />
                      ) : (
                        <Utensils className="w-5 h-5 text-brand-navy" />
                      )}
                      <h3 className="text-lg font-semibold text-brand-navy">
                        {event.name}
                      </h3>
                    </div>
                    
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(event.status)}`}>
                      {getStatusIcon(event.status)}
                      <span>{getStatusText(event.status)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-brand-gray mb-3">
                    <div className="flex items-center">
                      <span className="font-semibold mr-1">Date:</span>
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{event.location}</span>
                    </div>
                    {event.capacity && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>Max Capacity: {event.capacity}</span>
                      </div>
                    )}
                  </div>

                  {event.seatingConfig && (
                    <div className="text-sm text-brand-gray">
                      <span className="font-semibold">Layout:</span>
                      <span className="ml-1 capitalize">
                        {event.seatingConfig.layout_type || 'Table'} seating
                      </span>
                      {event.seatingConfig.layout_config && (
                        <span className="ml-2">
                          {event.seatingConfig.layout_type === 'classroom' 
                            ? `${event.seatingConfig.layout_config.rows}×${event.seatingConfig.layout_config.columns} grid`
                            : `${event.seatingConfig.layout_config.tables?.length || 0} tables`
                          }
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {hasConfiguration(event) ? (
                    <>
                      <button
                        onClick={() => handleManageSeating(event)}
                        className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Seating
                      </button>
                      <button
                        onClick={() => handleConfigureSeating(event)}
                        className="inline-flex items-center px-3 py-2 border border-brand-navy text-brand-navy rounded-lg hover:bg-brand-navy hover:text-white font-semibold"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConfigureSeating(event)}
                      className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Seating
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-brand-navy mb-4">
          Seating Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-brand-navy">
              {events.length}
            </div>
            <div className="text-sm text-brand-gray">Total Events</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">
              {events.filter(e => e.status === 'waiting').length}
            </div>
            <div className="text-sm text-brand-gray">Waiting Configuration</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {events.filter(e => e.status === 'active').length}
            </div>
            <div className="text-sm text-brand-gray">Active Seating</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {events.filter(e => e.status === 'configured').length}
            </div>
            <div className="text-sm text-brand-gray">Configured</div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Seating Management Features:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Automatic Detection:</strong> Events with "Assigned Seating" automatically appear here</li>
          <li>• <strong>Flexible Layouts:</strong> Choose between table seating and classroom grid layouts</li>
          <li>• <strong>Visual Assignment:</strong> Drag-and-drop interface for intuitive seat assignment</li>
          <li>• <strong>Capacity Management:</strong> Automatic validation against event capacity limits</li>
          <li>• <strong>Spouse Grouping:</strong> Spouses appear together in attendee list for easy adjacent seating</li>
          <li>• <strong>Multiple Assignments:</strong> Assign multiple attendees before saving changes</li>
        </ul>
      </div>
    </div>
  )
}