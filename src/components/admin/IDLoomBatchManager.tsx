import React, { useState, useEffect } from 'react'
import { X, RefreshCw, Trash2, Eye, AlertCircle, CheckCircle, Clock, Database, Users, FileText } from 'lucide-react'
import { useRawIDLoomData } from '../../hooks/useRawIDLoomData'
import { useIDLoomMappings } from '../../hooks/useIDLoomMappings'
import { IDLoomTransformationService } from '../../services/idloomTransformationService'
import { supabase } from '../../lib/supabase'

interface IDLoomBatchManagerProps {
  onClose: () => void
}

export default function IDLoomBatchManager({ onClose }: IDLoomBatchManagerProps) {
  const { importBatches, rawData, loading, refreshImportBatches, refreshRawData, deleteBatch } = useRawIDLoomData()
  const { mappings, getMappingByEventUid } = useIDLoomMappings()
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [batchDetails, setBatchDetails] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  useEffect(() => {
    refreshImportBatches()
    refreshRawData()
  }, [])

  const loadBatchDetails = async (batch: any) => {
    try {
      setSelectedBatch(batch)
      
      // Get detailed statistics for this batch
      const stats = await IDLoomTransformationService.getBatchTransformationStats(batch.batch_id)
      
      // Get sample raw records
      const { data: sampleRecords } = await supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .eq('import_batch_id', batch.batch_id)
        .limit(5)

      setBatchDetails({
        ...batch,
        stats,
        sampleRecords: sampleRecords || []
      })
    } catch (error) {
      console.error('Error loading batch details:', error)
      alert('Failed to load batch details')
    }
  }

  const processBatch = async (batch: any) => {
    try {
      setIsProcessing(true)
      setProcessingStatus('Loading field mappings...')
      
      // Get field mappings for this event
      const mapping = getMappingByEventUid(batch.event_uid)
      if (!mapping) {
        throw new Error('No field mappings found for this event')
      }

      setProcessingStatus('Transforming raw data...')
      
      // Transform the batch
      const transformationResult = await IDLoomTransformationService.transformBatch(
        batch.batch_id,
        mapping.field_mappings
      )

      setProcessingStatus('Creating attendee records...')
      
      // Create attendees from successful transformations
      const creationResult = await IDLoomTransformationService.createAttendeesFromTransformations(
        transformationResult.results
      )

      setProcessingStatus('Complete!')
      
      alert(`Batch processing completed!\n\nTransformed: ${transformationResult.successfulTransformations}\nFailed: ${transformationResult.failedTransformations}\nAttendees Created: ${creationResult.created}`)
      
      // Refresh data
      await refreshImportBatches()
      await refreshRawData()
      
      // Reload batch details
      await loadBatchDetails(batch)
      
    } catch (error) {
      console.error('Error processing batch:', error)
      alert(`Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const retryFailedTransformations = async (batch: any) => {
    try {
      setIsProcessing(true)
      setProcessingStatus('Retrying failed transformations...')
      
      const mapping = getMappingByEventUid(batch.event_uid)
      if (!mapping) {
        throw new Error('No field mappings found for this event')
      }

      const retryResult = await IDLoomTransformationService.retryFailedTransformations(
        batch.batch_id,
        mapping.field_mappings
      )

      if (retryResult.successfulTransformations > 0) {
        setProcessingStatus('Creating attendee records...')
        
        const creationResult = await IDLoomTransformationService.createAttendeesFromTransformations(
          retryResult.results.filter(r => r.success)
        )

        alert(`Retry completed!\n\nRetried: ${retryResult.totalRecords}\nSuccessful: ${retryResult.successfulTransformations}\nAttendees Created: ${creationResult.created}`)
      } else {
        alert('No additional records could be processed successfully.')
      }
      
      await refreshImportBatches()
      await loadBatchDetails(batch)
      
    } catch (error) {
      console.error('Error retrying transformations:', error)
      alert(`Failed to retry transformations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (confirm('Are you sure you want to delete this import batch? This will remove all raw data and cannot be undone.')) {
      try {
        await deleteBatch(batchId)
        setSelectedBatch(null)
        setBatchDetails(null)
      } catch (error) {
        console.error('Error deleting batch:', error)
        alert('Failed to delete batch')
      }
    }
  }

  const getBatchStatusColor = (batch: any) => {
    if (batch.stats?.failed > 0) return 'bg-red-100 text-red-800 border-red-200'
    if (batch.stats?.pending > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (batch.stats?.processed === batch.stats?.total) return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  const getBatchStatusIcon = (batch: any) => {
    if (batch.stats?.failed > 0) return <AlertCircle className="w-4 h-4" />
    if (batch.stats?.pending > 0) return <Clock className="w-4 h-4" />
    if (batch.stats?.processed === batch.stats?.total) return <CheckCircle className="w-4 h-4" />
    return <Database className="w-4 h-4" />
  }

  if (selectedBatch && batchDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-brand-navy">
                Batch Details: {batchDetails.event_name}
              </h2>
              <p className="text-brand-gray text-sm">
                Batch ID: {batchDetails.batch_id} • Created: {new Date(batchDetails.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => { setSelectedBatch(null); setBatchDetails(null); }}
              className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Batch Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{batchDetails.stats.total}</div>
                <div className="text-sm text-blue-800">Total Records</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{batchDetails.stats.processed}</div>
                <div className="text-sm text-green-800">Processed</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{batchDetails.stats.pending}</div>
                <div className="text-sm text-yellow-800">Pending</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{batchDetails.stats.failed}</div>
                <div className="text-sm text-red-800">Failed</div>
              </div>
            </div>

            {/* Processing Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-brand-navy mb-4">Processing Actions</h3>
              <div className="flex items-center space-x-4">
                {batchDetails.stats.pending > 0 && (
                  <button
                    onClick={() => processBatch(batchDetails)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Pending ({batchDetails.stats.pending})
                  </button>
                )}
                
                {batchDetails.stats.failed > 0 && (
                  <button
                    onClick={() => retryFailedTransformations(batchDetails)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Failed ({batchDetails.stats.failed})
                  </button>
                )}
                
                <button
                  onClick={() => handleDeleteBatch(batchDetails.batch_id)}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Batch
                </button>
              </div>
              
              {isProcessing && (
                <div className="mt-4 flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-navy"></div>
                  <span className="text-brand-navy font-semibold">{processingStatus}</span>
                </div>
              )}
            </div>

            {/* Sample Raw Data */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-brand-navy mb-4">
                Sample Raw Data ({batchDetails.sampleRecords.length})
              </h3>
              
              {batchDetails.sampleRecords.length > 0 ? (
                <div className="space-y-4">
                  {batchDetails.sampleRecords.map((record: any, index: number) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-md font-semibold text-brand-navy">
                            Record {index + 1}: {record.guest_uid}
                          </h4>
                          <div className="text-sm text-brand-gray">
                            {record.processed ? 'Processed' : 'Pending'} • 
                            {record.processing_errors?.length > 0 ? ` ${record.processing_errors.length} errors` : ' No errors'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {record.processed && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                          {record.processing_errors?.length > 0 && (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="text-sm font-semibold text-brand-navy mb-2">Raw Data Sample:</h5>
                        <pre className="text-xs text-brand-gray overflow-x-auto">
                          {JSON.stringify(record.raw_data, null, 2).substring(0, 500)}...
                        </pre>
                      </div>
                      
                      {record.processing_errors?.length > 0 && (
                        <div className="mt-3 bg-red-50 p-3 rounded-lg">
                          <h5 className="text-sm font-semibold text-red-800 mb-2">Processing Errors:</h5>
                          <ul className="text-xs text-red-700 space-y-1">
                            {record.processing_errors.map((error: string, errorIndex: number) => (
                              <li key={errorIndex}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-brand-gray">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sample records available</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => { setSelectedBatch(null); setBatchDetails(null); }}
              className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            IDLoom Import Batch Manager
          </h1>
          <p className="text-brand-gray">
            Manage and process IDLoom import batches
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-brand-gray hover:text-brand-navy"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
          <span className="ml-3 text-brand-navy">Loading import batches...</span>
        </div>
      ) : importBatches.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-brand-navy uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {importBatches.map((batch) => (
                  <tr key={batch.batch_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-brand-navy">
                        {batch.event_name}
                      </div>
                      <div className="text-xs text-brand-gray">
                        Event UID: {batch.event_uid}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-brand-navy">
                        {batch.total_records} total
                      </div>
                      <div className="text-xs text-brand-gray">
                        {batch.processed_records} processed • {batch.failed_records} failed
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full border ${getBatchStatusColor(batch)}`}>
                        {getBatchStatusIcon(batch)}
                        <span>{batch.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-brand-gray">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-brand-gray">
                        {new Date(batch.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => loadBatchDetails(batch)}
                          className="p-1 text-brand-gray hover:text-brand-navy"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch.batch_id)}
                          className="p-1 text-brand-gray hover:text-red-600"
                          title="Delete batch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Database className="w-12 h-12 text-brand-gray mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            No Import Batches Found
          </h3>
          <p className="text-brand-gray">
            Import batches will appear here after you import data from IDLoom events.
          </p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">IDLoom Batch Management:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Raw Data Storage:</strong> All IDLoom data is preserved in its original format</li>
          <li>• <strong>Batch Processing:</strong> Transform raw data using saved field mappings</li>
          <li>• <strong>Error Recovery:</strong> Retry failed transformations with updated mappings</li>
          <li>• <strong>Audit Trail:</strong> Complete history of all imports and processing attempts</li>
          <li>• <strong>Data Safety:</strong> Original data is never modified, only transformed copies are created</li>
        </ul>
      </div>
    </div>
  )
}