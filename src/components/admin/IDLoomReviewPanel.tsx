import React, { useState, useEffect } from 'react'
import { X, Eye, CheckCircle, AlertCircle, User, Building, Mail, Phone, Calendar, MapPin, Users, RefreshCw, Download, Trash2, Save, Edit3, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useBreakoutSessions } from '../../hooks/useSupabaseData'
import { IDLoomTransformationService } from '../../services/idloomTransformationService'

export default function IDLoomReviewPanel() {
  const [pendingRecords, setPendingRecords] = useState<any[]>([])
  const [hotelsList, setHotelsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [editedData, setEditedData] = useState<any>(null)
  const [transformedData, setTransformedData] = useState<any | null>(null)
  const [editableData, setEditableData] = useState<any | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [stats, setStats] = useState<any>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [availableBreakouts, setAvailableBreakouts] = useState<any[]>([])
  const [currentAttendeeSelectedBreakouts, setCurrentAttendeeSelectedBreakouts] = useState<string[]>([])
  const { breakoutSessions } = useBreakoutSessions()
  const recordsPerPage = 20

  useEffect(() => {
    loadPendingRecords()
    loadStats()
    loadHotels()
    loadAvailableBreakouts()
  }, [currentPage])

  const loadAvailableBreakouts = async () => {
    try {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('type', 'breakout')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching breakout sessions:', error)
        setAvailableBreakouts([])
      } else {
        setAvailableBreakouts(data || [])
      }
    } catch (error) {
      console.error('Error loading breakout sessions:', error)
      setAvailableBreakouts([])
    }
  }

  const handleBreakoutToggle = (breakoutId: string, isSelected: boolean) => {
    setCurrentAttendeeSelectedBreakouts(prev => {
      if (isSelected) {
        return [...prev, breakoutId]
      } else {
        return prev.filter(id => id !== breakoutId)
      }
    })
  }

  const loadHotels = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name, address, phone, website, is_active, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching hotels:', error)
        setHotelsList([])
      } else {
        setHotelsList(data || [])
        console.log(`Loaded ${data?.length || 0} hotels for review panel`)
      }
    } catch (error) {
      console.error('Error loading hotels:', error)
      setHotelsList([])
    }
  }
  const loadStats = async () => {
    try {
      const transformationStats = await IDLoomTransformationService.getTransformationStats()
      setStats(transformationStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Initialize editedData when a record is selected
  useEffect(() => {
    if (selectedRecord && transformedData) {
      setEditedData({ ...transformedData })
    }
  }, [selectedRecord, transformedData])

  const loadPendingRecords = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await IDLoomTransformationService.getPendingReviewRecords(
        recordsPerPage, 
        currentPage * recordsPerPage
      )
      
      setPendingRecords(result.records || [])
      setTotalRecords(result.total)
      setHasMore(result.hasMore)
      
    } catch (err) {
      console.error('Error loading pending records:', err)
      setError('Failed to load pending records')
      setPendingRecords([])
    } finally {
      setLoading(false)
    }
  }

  const getEventDisplayName = (record: any) => {
    try {
      const rawData = record.raw_data
      
      // Check if this is a Software Day attendee by looking for the specific event UID
      if (rawData && rawData.event_uid === '685d31f25621c') {
        return 'Software Day + KnowledgeNow 2025'
      }
      
      // Default to KnowledgeNow 2025 for all other events
      return 'KnowledgeNow 2025'
    } catch (error) {
      console.error('Error parsing event name:', error)
      return 'KnowledgeNow 2025'
    }
  }
  const handleReviewRecord = async (record: any) => {
    setSelectedRecord(record)
    setIsProcessing(true)
    setProcessingStatus('Transforming record...')
    
    try {
      // Pass the available breakout sessions to the transformation service
      const transformResult = await IDLoomTransformationService.transformRawRecord(record, breakoutSessions)
      setTransformedData(transformResult)
      
      // Create editable copy of the transformed data
      if (transformResult.success && transformResult.mainAttendee) {
        setEditableData({
          mainAttendee: { ...transformResult.mainAttendee },
          spouseAttendee: transformResult.mainAttendee.spouse_details && 
                          (transformResult.mainAttendee.spouse_details.firstName || transformResult.mainAttendee.spouse_details.first_name) ? 
                          { 
                            salutation: transformResult.mainAttendee.spouse_details.salutation || '',
                            first_name: transformResult.mainAttendee.spouse_details.firstName || transformResult.mainAttendee.spouse_details.first_name || '',
                            last_name: transformResult.mainAttendee.spouse_details.lastName || transformResult.mainAttendee.spouse_details.last_name || '',
                            email: transformResult.mainAttendee.spouse_details.email || '',
                            mobile_phone: transformResult.mainAttendee.spouse_details.mobilePhone || transformResult.mainAttendee.spouse_details.mobile_phone || '',
                            dietary_requirements: transformResult.mainAttendee.spouse_details.dietaryRequirements || transformResult.mainAttendee.spouse_details.dietary_requirements || ''
                          } : null
        })
      }
    } catch (error) {
      console.error('Error transforming record:', error)
      setError('Failed to transform record')
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const getHotelDisplayName = (hotelId: string) => {
    if (!hotelId) return 'Not selected'
    
    if (hotelId === 'custom') {
      return 'Custom Hotel'
    }
    
    const hotel = hotelsList.find(h => h.id === hotelId)
    return hotel ? hotel.name : `Hotel ID: ${hotelId}`
  }
  const handleIgnoreRecord = async (record: any) => {
    if (!confirm('Are you sure you want to ignore this record? It will be marked as skipped and removed from the review queue.')) {
      return
    }
    
    try {
      setIsProcessing(true)
      setProcessingStatus('Ignoring record...')
      
      const { error } = await supabase
        .from('raw_attendee_data_idloom')
        .delete()
        .eq('id', record.id)
        
      if (!error) {
        await loadPendingRecords()
        await loadStats()
      } else {
        setError('Failed to ignore record')
      }
    } catch (error) {
      console.error('Error ignoring record:', error)
      setError('Failed to ignore record')
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }
  const handleApproveRecord = async () => {
    if (!selectedRecord || !editableData) return
    
    setIsProcessing(true)
    setProcessingStatus('Approving and importing...')
    
    try {
      // Pass the available breakout sessions to the approval process
      const result = await IDLoomTransformationService.approveAndImport(
        selectedRecord.id,
        editableData.mainAttendee,
        editableData.spouseAttendee,
        breakoutSessions
      )
      
      if (result.success) {
        await loadPendingRecords()
        await loadStats()
        setSelectedRecord(null)
        setTransformedData(null)
        setEditableData(null)
      } else {
        setError(`Failed to approve record: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      console.error('Error approving record:', error)
      setError('Failed to approve record')
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const handleRejectRecord = async (reason?: string) => {
    if (!selectedRecord) return
    
    setIsProcessing(true)
    setProcessingStatus('Rejecting record...')
    
    try {
      const success = await IDLoomTransformationService.rejectRecord(selectedRecord.id, reason)
      
      if (success) {
        await loadPendingRecords()
        await loadStats()
        setSelectedRecord(null)
        setTransformedData(null)
        setEditableData(null)
      } else {
        setError('Failed to reject record')
      }
    } catch (error) {
      console.error('Error rejecting record:', error)
      setError('Failed to reject record')
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const updateEditableField = (path: string, value: any) => {
    setEditableData(prev => {
      if (!prev) return prev
      
      const newData = { ...prev }
      const keys = path.split('.')
      let current = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const toggleAttribute = (attributeName: string) => {
    setEditableData(prev => {
      if (!prev || !prev.mainAttendee) return prev
      
      return {
        ...prev,
        mainAttendee: {
          ...prev.mainAttendee,
          attributes: {
            ...prev.mainAttendee.attributes,
            [attributeName]: !prev.mainAttendee.attributes[attributeName]
          }
        }
      }
    })
  }

  const handleFundAffiliationToggle = (fundType: string) => {
    setEditableData(prev => {
      if (!prev || !prev.mainAttendee) return prev
      
      const currentFund = prev.mainAttendee.attributes?.fundAffiliation
      const newFund = currentFund === fundType ? '' : fundType
      
      return {
        ...prev,
        mainAttendee: {
          ...prev.mainAttendee,
          attributes: {
            ...prev.mainAttendee.attributes,
            fundAffiliation: newFund
          }
        }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        <span className="ml-3 text-brand-navy">Loading IDLoom review data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">Error: {error}</p>
        </div>
        <button 
          onClick={() => { setError(null); loadPendingRecords(); }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (selectedRecord) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full h-full m-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-brand-navy">
                Review IDLoom Record
              </h2>
              <p className="text-brand-gray text-sm">
                Guest UID: {selectedRecord.idloom_guest_uid} • Event: {selectedRecord.idloom_event_uid}
              </p>
            </div>
            <button
              onClick={() => { 
                setSelectedRecord(null); 
                setTransformedData(null); 
                setEditableData(null);
              }}
              className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isProcessing && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-semibold">{processingStatus}</span>
              </div>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Raw Data */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Raw IDLoom Data
                </h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="bg-white p-4 rounded border max-h-[calc(100vh-300px)] overflow-y-auto">
                    <pre className="text-xs text-brand-gray whitespace-pre-wrap">
                      {JSON.stringify(selectedRecord.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>

                {!transformedData && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => handleReviewRecord(selectedRecord)}
                      disabled={isProcessing}
                      className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Transform & Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Editable Fields */}
            <div className="w-1/2 overflow-y-auto">
              <div className="p-6">
                {transformedData && editableData ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-brand-navy flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Editable Attendee Data
                      </h3>
                      {transformedData.success ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-semibold">Ready to Import</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle className="w-5 h-5" />
                          <span className="text-sm font-semibold">Needs Review</span>
                        </div>
                      )}
                    </div>

                    {/* Personal Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Salutation</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.salutation || ''}
                            onChange={(e) => updateEditableField('mainAttendee.salutation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="e.g., Dr, Mr, Ms, Prof"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">First Name *</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.first_name || ''}
                            onChange={(e) => updateEditableField('mainAttendee.first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.last_name || ''}
                            onChange={(e) => updateEditableField('mainAttendee.last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Email *</label>
                          <input
                            type="email"
                            value={editableData?.mainAttendee?.email || ''}
                            onChange={(e) => updateEditableField('mainAttendee.email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Title *</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.title || ''}
                            onChange={(e) => updateEditableField('mainAttendee.title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Company *</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.company || ''}
                            onChange={(e) => updateEditableField('mainAttendee.company', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Dietary Requirements</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.dietary_requirements || ''}
                            onChange={(e) => updateEditableField('mainAttendee.dietary_requirements', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="Any dietary restrictions or preferences"
                          />
                        </div>
                      </div>
                      
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3 flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        Contact Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Business Phone</label>
                          <input
                            type="tel"
                            value={editableData?.mainAttendee?.business_phone || ''}
                            onChange={(e) => updateEditableField('mainAttendee.business_phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Mobile Phone</label>
                          <input
                            type="tel"
                            value={editableData?.mainAttendee?.mobile_phone || ''}
                            onChange={(e) => updateEditableField('mainAttendee.mobile_phone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Address Line 1</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.address1 || ''}
                            onChange={(e) => updateEditableField('mainAttendee.address1', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="Street address"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Address Line 2</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.address2 || ''}
                            onChange={(e) => updateEditableField('mainAttendee.address2', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="Suite, floor, etc."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">City</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.city || ''}
                            onChange={(e) => updateEditableField('mainAttendee.city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="City"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">State/Province</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.state || ''}
                            onChange={(e) => updateEditableField('mainAttendee.state', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="State or province"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Country</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.country || ''}
                            onChange={(e) => updateEditableField('mainAttendee.country', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="Country"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Country Code</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.country_code || ''}
                            onChange={(e) => updateEditableField('mainAttendee.country_code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="e.g., US, UK, FR"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Postal Code</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.postal_code || ''}
                            onChange={(e) => updateEditableField('mainAttendee.postal_code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="ZIP or postal code"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Breakout Session Selections */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Breakout Session Selections
                      </h4>
                      
                      <p className="text-sm text-brand-gray mb-4">
                        Breakout sessions extracted from IDLoom registration data:
                      </p>
                      
                      {transformedData.selected_breakouts && transformedData.selected_breakouts.length > 0 ? (
                        <div className="space-y-3">
                          {transformedData.selected_breakouts.map((sessionId: string, index: number) => {
                            const session = availableBreakouts.find(s => s.id === sessionId)
                            
                            if (!session) {
                              return (
                                <div key={sessionId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm font-semibold text-yellow-800">
                                      Unknown Session ID: {sessionId}
                                    </span>
                                  </div>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    This session ID was extracted but no matching session found in the database
                                  </p>
                                </div>
                              )
                            }
                            
                            return (
                              <div key={sessionId} className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="text-md font-semibold text-green-800">
                                      {session.title}
                                    </h4>
                                    <p className="text-sm text-green-700 mt-1">
                                      {session.description}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs text-green-600 mt-2">
                                      <div className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(session.date).toLocaleDateString()}
                                      </div>
                                      <div className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {session.start_time} - {session.end_time}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(transformedData.selected_breakouts || []).map((sessionName: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-blue-800 font-medium">{sessionName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {!transformedData.selected_breakouts || transformedData.selected_breakouts.length === 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <Calendar className="w-8 h-8 text-brand-gray mx-auto mb-2" />
                          <p className="text-sm text-brand-gray">
                            No breakout sessions extracted from IDLoom data
                          </p>
                          <p className="text-xs text-brand-gray mt-1">
                            The attendee has not registered for any breakout sessions, or the extraction logic did not find matching sessions
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Extracted Sessions:</strong> {(editableData?.mainAttendee?.selected_breakouts || []).length} breakout session{(editableData?.mainAttendee?.selected_breakouts || []).length !== 1 ? 's' : ''} will be added to the attendee record
                        </p>
                      </div>
                    </div>

                    {/* Hotel & Travel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Hotel & Travel
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Check-in Date</label>
                          <input
                            type="date"
                            value={editableData?.mainAttendee?.check_in_date || ''}
                            onChange={(e) => updateEditableField('mainAttendee.check_in_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Check-out Date</label>
                          <input
                            type="date"
                            value={editableData?.mainAttendee?.check_out_date || ''}
                            onChange={(e) => updateEditableField('mainAttendee.check_out_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Hotel Selection</label>
                          <select
                            value={editableData?.mainAttendee?.hotel_selection || ''}
                            onChange={(e) => updateEditableField('mainAttendee.hotel_selection', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                          >
                            <option value="">Select Hotel...</option>
                            {hotelsList.map((hotel) => (
                              <option key={hotel.id} value={hotel.id}>
                                {hotel.name}
                              </option>
                            ))}
                            <option value="custom">Custom Hotel</option>
                          </select>
                        </div>
                        
                        {editableData?.mainAttendee?.hotel_selection === 'custom' && (
                          <div>
                            <label className="block text-sm font-semibold text-brand-navy mb-1">Custom Hotel Name</label>
                            <input
                              type="text"
                              value={editableData?.mainAttendee?.custom_hotel || ''}
                              onChange={(e) => updateEditableField('mainAttendee.custom_hotel', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                              placeholder="Enter custom hotel name"
                            />
                          </div>
                        )}
                        
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Hotel Notes</label>
                          <textarea
                            value={editableData?.mainAttendee?.hotel_notes || ''}
                            onChange={(e) => updateEditableField('mainAttendee.hotel_notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm resize-none"
                            placeholder="Special hotel requests or notes"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assistant Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3 pb-2 border-b border-gray-200">
                        Assistant Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-2">
                            Assistant Name
                          </label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.assistant_name || ''}
                            onChange={(e) => updateEditableField('mainAttendee.assistant_name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                            placeholder="Assistant's full name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-2">
                            Assistant Email
                          </label>
                          <input
                            type="email"
                            value={editableData?.mainAttendee?.assistant_email || ''}
                            onChange={(e) => updateEditableField('mainAttendee.assistant_email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                            placeholder="assistant@company.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Registration Details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3">Registration Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-1">Registration Status</label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.registration_status || ''}
                            onChange={(e) => updateEditableField('mainAttendee.registration_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                            placeholder="e.g., confirmed, pending, cancelled"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-2">
                            Registration ID
                          </label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.registration_id || ''}
                            onChange={(e) => updateEditableField('mainAttendee.registration_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                            placeholder="Registration identifier"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-brand-navy mb-2">
                            IDLoom ID
                          </label>
                          <input
                            type="text"
                            value={editableData?.mainAttendee?.idloom_id || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                            placeholder="External system identifier"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Attendee Attributes */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3">Attendee Attributes</h4>
                      
                      {/* Apax Personnel */}
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-brand-navy mb-2">Apax Personnel</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.apaxIP || false}
                              onChange={() => toggleAttribute('apaxIP')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Apax IP</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.apaxEP || false}
                              onChange={() => toggleAttribute('apaxEP')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Apax EP</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.apaxOther || false}
                              onChange={() => toggleAttribute('apaxOther')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Apax Other</span>
                          </label>
                          
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.apaxOEP || false}
                              onChange={() => toggleAttribute('apaxOEP')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Apax OEP</span>
                          </label>
                        </div>
                      </div>

                      {/* Non-Apax Attendee Attributes */}
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-brand-navy mb-2">Non-Apax Attendee Attributes</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.portfolioCompanyExecutive || false}
                              onChange={() => toggleAttribute('portfolioCompanyExecutive')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Portfolio Company Exec</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.sponsorAttendee || false}
                              onChange={() => toggleAttribute('sponsorAttendee')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Sponsor / Vendor Attendee</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.speaker || false}
                              onChange={() => toggleAttribute('speaker')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Speaker or Executive Presenter</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.otherAttendeeType || false}
                              onChange={() => toggleAttribute('otherAttendeeType')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Other Attendee Type</span>
                          </label>
                        </div>
                      </div>

                      {/* Role Information */}
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-brand-navy mb-2">Role Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.ceo || false}
                              onChange={() => toggleAttribute('ceo')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CEO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.cfo || editableData?.mainAttendee?.is_cfo || false}
                              onChange={() => {
                                toggleAttribute('cfo')
                                updateEditableField('mainAttendee.is_cfo', !editableData?.mainAttendee?.attributes?.cfo)
                              }}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CFO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.cmo || false}
                              onChange={() => toggleAttribute('cmo')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CMO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.cro || false}
                              onChange={() => toggleAttribute('cro')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CRO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.coo || false}
                              onChange={() => toggleAttribute('coo')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">COO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.chro || false}
                              onChange={() => toggleAttribute('chro')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CHRO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.cto_cio || false}
                              onChange={() => toggleAttribute('cto_cio')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">CTO/CIO</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.otherCLevelExec || false}
                              onChange={() => toggleAttribute('otherCLevelExec')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Other C-Level Exec</span>
                          </label>
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={editableData?.mainAttendee?.attributes?.nonCLevelExec || false}
                              onChange={() => toggleAttribute('nonCLevelExec')}
                              className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                            />
                            <span className="text-sm text-brand-navy">Non C-Level Exec</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Fund Affiliation */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3">Fund Affiliation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editableData?.mainAttendee?.attributes?.fundAffiliation === 'buyout'}
                            onChange={() => handleFundAffiliationToggle('buyout')}
                            className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-brand-navy">Buyout Funds</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editableData?.mainAttendee?.attributes?.fundAffiliation === 'digital'}
                            onChange={() => handleFundAffiliationToggle('digital')}
                            className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-brand-navy">Digital Funds</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editableData?.mainAttendee?.attributes?.fundAffiliation === 'impact'}
                            onChange={() => handleFundAffiliationToggle('impact')}
                            className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-brand-navy">Impact Funds</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editableData?.mainAttendee?.attributes?.fundAffiliation === 'other'}
                            onChange={() => handleFundAffiliationToggle('other')}
                            className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                          />
                          <span className="text-sm text-brand-navy">Other Funds</span>
                        </label>
                      </div>
                    </div>

                    {/* Spouse Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-brand-navy mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Spouse/Partner Information
                      </h4>
                      
                      <div className="mb-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={editableData?.mainAttendee?.has_spouse || false}
                            onChange={(e) => updateEditableField('mainAttendee.has_spouse', e.target.checked)}
                            className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                          />
                          <span className="text-sm font-semibold text-brand-navy">Has spouse/partner attending</span>
                        </label>
                      </div>

                      {(editableData?.mainAttendee?.has_spouse || editableData?.spouseAttendee) && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h5 className="text-md font-semibold text-purple-800 mb-3">
                            Spouse/Partner Details
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-purple-800 mb-1">First Name</label>
                              <input
                                type="text"
                                value={editableData?.spouseAttendee?.first_name || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.first_name', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-800 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={editableData?.spouseAttendee?.last_name || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.last_name', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-800 mb-1">Salutation</label>
                              <input
                                type="text"
                                value={editableData?.spouseAttendee?.salutation || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.salutation', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                                placeholder="Mr, Mrs, Ms, Dr, etc."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-semibold text-purple-800 mb-1">Email</label>
                              <input
                                type="email"
                                value={editableData?.spouseAttendee?.email || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.email', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-purple-800 mb-1">Mobile Phone</label>
                              <input
                                type="tel"
                                value={editableData?.spouseAttendee?.mobile_phone || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.mobile_phone', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-purple-800 mb-1">
                                Spouse Dietary Requirements
                              </label>
                              <input
                                type="text"
                                value={editableData?.spouseAttendee?.dietary_requirements || ''}
                                onChange={(e) => updateEditableField('spouseAttendee.dietary_requirements', e.target.value)}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
                                placeholder="Any dietary restrictions or preferences for spouse"
                              />
                            </div>
                          </div>
                          
                          {/* Debug info for spouse data */}
                          <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                            <p className="text-xs text-purple-800 font-semibold mb-1">Debug: Spouse Data Source</p>
                            <div className="text-xs text-purple-700 space-y-1">
                              <div>Has Spouse: {editableData?.mainAttendee?.has_spouse ? 'Yes' : 'No'}</div>
                              <div>Spouse Details Object: {editableData?.mainAttendee?.spouse_details ? 'Present' : 'Missing'}</div>
                              {editableData?.mainAttendee?.spouse_details && (
                                <div className="bg-white p-2 rounded border">
                                  <pre className="text-xs">
                                    {JSON.stringify(editableData.mainAttendee.spouse_details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transformation Warnings/Errors */}
                    {transformedData.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="font-semibold text-yellow-800">Transformation Warnings</span>
                        </div>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {(transformedData.warnings || []).map((warning: string, index: number) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {transformedData.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <span className="font-semibold text-red-800">Transformation Errors</span>
                        </div>
                        <ul className="text-sm text-red-700 space-y-1">
                          {(transformedData.errors || []).map((error: string, index: number) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-brand-gray mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-brand-navy mb-2">
                      Transform Record to Begin Review
                    </h3>
                    <p className="text-brand-gray mb-6">
                      Click "Transform & Edit" to convert the raw IDLoom data into editable attendee fields.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => { 
                setSelectedRecord(null); 
                setTransformedData(null); 
                setEditableData(null);
              }}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            
            <div className="flex space-x-4">
              {transformedData && editableData && (
                <>
                  <button
                    onClick={() => handleRejectRecord('Manual rejection after review')}
                    disabled={isProcessing}
                    className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject Record
                  </button>
                  <button
                    onClick={handleApproveRecord}
                    disabled={isProcessing || transformedData.errors.length > 0}
                    className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Import
                  </button>
                </>
              )}
            </div>
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
            IDLoom Review Panel
          </h1>
          <p className="text-brand-gray">
            Review and approve IDLoom imports before creating attendee records
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadPendingRecords}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-sm text-blue-800">Total Records</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          <div className="text-sm text-yellow-800">Pending Review</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
          <div className="text-sm text-green-800">Approved</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          <div className="text-sm text-red-800">Rejected</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.failed || 0}</div>
          <div className="text-sm text-gray-800">Failed</div>
        </div>
      </div>

      {pendingRecords.length > 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Guest Info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Import Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-brand-navy">
                          {record.raw_data?.first_name || record.raw_data?.firstname || 'Unknown'} {record.raw_data?.last_name || record.raw_data?.lastname || 'Name'}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {record.raw_data?.email || 'No email'}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {record.raw_data?.title || record.raw_data?.job_title || 'No title'}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {record.raw_data?.cpy_name || record.raw_data?.company || 'No company'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-brand-navy">
                          {getEventDisplayName(record)}
                        </div>
                        <div className="text-xs text-brand-gray">
                          Guest: {record.idloom_guest_uid}
                        </div>
                        <div className="text-xs text-brand-gray">
                          Batch: {record.import_batch_id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-brand-gray">
                          {new Date(record.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {new Date(record.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                          {record.import_status === 'pending' && (
                            <div>
                              {record.is_existing_attendee ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Existing Attendee Update
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  New Registration
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {record.processing_errors && record.processing_errors.length > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              {record.processing_errors.length} Error(s)
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleIgnoreRecord(record)}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-sm disabled:opacity-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Ignore
                          </button>
                          <button
                            onClick={() => handleReviewRecord(record)}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-sm disabled:opacity-50"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review & Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {(currentPage > 0 || hasMore) && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-6 py-3">
              <div className="text-sm text-brand-gray">
                Showing {currentPage * recordsPerPage + 1} to {Math.min((currentPage + 1) * recordsPerPage, totalRecords)} of {totalRecords} records
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasMore}
                  className="px-4 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-brand-navy mb-2">
            No Records Pending Review
          </h3>
          <p className="text-brand-gray">
            All IDLoom imports have been reviewed. New imports will appear here for approval.
          </p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">IDLoom Review Process:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Raw Data Preservation:</strong> All IDLoom data is preserved in original format on the left</li>
          <li>• <strong>Editable Fields:</strong> Transform and edit attendee data on the right before importing</li>
          <li>• <strong>Attribute Management:</strong> Review and adjust attendee attributes and classifications</li>
          <li>• <strong>Spouse Handling:</strong> Automatically detects and creates spouse records when applicable</li>
          <li>• <strong>Manual Review:</strong> Approve or reject each import individually after editing</li>
          <li>• <strong>Data Validation:</strong> Required fields are validated before allowing import</li>
        </ul>
      </div>
    </div>
  )
}