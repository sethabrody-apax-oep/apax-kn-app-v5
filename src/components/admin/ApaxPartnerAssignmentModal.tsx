import React, { useState, useEffect } from 'react'
import { X, Users, Save, Search, User, Building } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ApaxPartnerAssignmentModalProps {
  company: any
  onSave: () => void // Callback to refresh parent data
  onCancel: () => void
}

export default function ApaxPartnerAssignmentModal({ company, onSave, onCancel }: ApaxPartnerAssignmentModalProps) {
  const [apaxAttendees, setApaxAttendees] = useState<any[]>([])
  const [currentPartners, setCurrentPartners] = useState<string[]>([])
  const [selectedPartners, setSelectedPartners] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadApaxAttendees()
    loadCurrentPartners()
  }, [company.id])

  const loadApaxAttendees = async () => {
    try {
      setLoading(true)
      // Load all Apax IP and Apax OEP attendees
      const { data, error } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, email, title, company, attributes, is_apax_ep')
        .eq('registration_status', 'confirmed')
        .order('first_name', { ascending: true })

      if (error) throw error

      // Filter for Apax IP and Apax OEP attendees
      const apaxOnly = (data || []).filter(attendee => 
        (attendee.attributes?.apaxIP || attendee.attributes?.apaxOEP || attendee.is_apax_ep) &&
        attendee.first_name && attendee.last_name // Ensure valid names
      )

      setApaxAttendees(apaxOnly)
    } catch (error: any) {
      console.error('Error loading Apax attendees:', error)
      setSaveError(`Failed to load Apax attendees: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('company_apax_partners')
        .select('attendee_id')
        .eq('standardized_company_id', company.id)

      if (error) throw error

      const partnerIds = (data || []).map(p => p.attendee_id)
      setCurrentPartners(partnerIds)
      setSelectedPartners(partnerIds) // Initialize selected with current partners
    } catch (error: any) {
      console.error('Error loading current partners:', error)
      setSaveError(`Failed to load current partners: ${error.message}`)
    }
  }

  const filteredAttendees = apaxAttendees.filter(attendee =>
    `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const togglePartnerSelection = (attendeeId: string) => {
    setSelectedPartners(prev => {
      if (prev.includes(attendeeId)) {
        return prev.filter(id => id !== attendeeId)
      } else if (prev.length < 3) {
        return [...prev, attendeeId]
      } else {
        alert('Maximum 3 Apax partners can be assigned per company.')
        return prev
      }
    })
  }

  const getAttendeeType = (attendee: any) => {
    if (attendee.attributes?.apaxIP) return 'Apax IP'
    if (attendee.attributes?.apaxOEP || attendee.is_apax_ep) return 'Apax OEP'
    return 'Apax' // Fallback
  }

  const getAttendeeTypeColor = (attendee: any) => {
    if (attendee.attributes?.apaxIP) return 'bg-purple-100 text-purple-800'
    if (attendee.attributes?.apaxOEP || attendee.is_apax_ep) return 'bg-green-100 text-green-800'
    return 'bg-blue-100 text-blue-800' // Default for other Apax types
  }

  const handleSavePartners = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      // Delete existing assignments for this company
      const { error: deleteError } = await supabase
        .from('company_apax_partners')
        .delete()
        .eq('standardized_company_id', company.id)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (selectedPartners.length > 0) {
        const partnersToInsert = selectedPartners.map(attendeeId => ({
          standardized_company_id: company.id,
          attendee_id: attendeeId
        }))

        const { error: insertError } = await supabase
          .from('company_apax_partners')
          .insert(partnersToInsert)

        if (insertError) throw insertError
      }
      
      onSave() // Notify parent to refresh counts
      onCancel() // Close modal on success
    } catch (error: any) {
      console.error('Error saving partners:', error)
      setSaveError(`Failed to save partners: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Assign Apax Partners: {company.name}
            </h2>
            <p className="text-brand-gray text-sm">
              Select up to 3 responsible Apax partners for this company
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {saveError}
            </div>
          )}
          {/* Selection Summary */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-900">
                Selected Partners: {selectedPartners.length}/3
              </span>
              <span className="text-sm text-blue-700">
                {3 - selectedPartners.length} remaining
              </span>
            </div>
            {selectedPartners.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPartners.map(partnerId => {
                  const partner = apaxAttendees.find(a => a.id === partnerId)
                  return partner ? (
                    <span key={partnerId} className="inline-flex px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                      {partner.first_name} {partner.last_name}
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
              <input
                type="text"
                placeholder="Search Apax attendees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
          </div>

          {/* Attendee List */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
                <span className="ml-3 text-brand-navy">Loading Apax attendees...</span>
              </div>
            ) : filteredAttendees.length > 0 ? (
              <div className="space-y-1 p-2">
                {filteredAttendees.map((attendee) => {
                  const isSelected = selectedPartners.includes(attendee.id)
                  
                  return (
                    <button
                      key={attendee.id}
                      onClick={() => togglePartnerSelection(attendee.id)}
                      disabled={!isSelected && selectedPartners.length >= 3}
                      className={`w-full text-left p-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-brand-navy text-white'
                          : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">
                              {attendee.first_name} {attendee.last_name}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendeeTypeColor(attendee)}`}>
                              {getAttendeeType(attendee)}
                            </span>
                          </div>
                          <div className="text-xs opacity-75">
                            {attendee.title} • {attendee.company}
                          </div>
                          <div className="text-xs opacity-75">
                            {attendee.email}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-brand-navy rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-brand-gray">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No Apax attendees found matching your search</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePartners}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : `Save Partners (${selectedPartners.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}