import React, { useState, useEffect } from 'react'
import { Search, X, User, Building, Mail, Plus } from 'lucide-react'
import { useAttendees } from '../../hooks/useSupabaseData'

interface AttendeeSearchSelectorProps {
  selectedAttendeeIds: string[]
  onSelectionChange: (attendeeIds: string[]) => void
  maxSelections?: number
  placeholder?: string
  excludeCompany?: string // Optional filter to exclude attendees from specific company
}

export default function AttendeeSearchSelector({
  selectedAttendeeIds,
  onSelectionChange,
  maxSelections = 5,
  placeholder = "Search attendees...",
  excludeCompany
}: AttendeeSearchSelectorProps) {
  const { attendees, loading, error } = useAttendees()
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Filter attendees based on search term and company filter
  const filteredAttendees = attendees.filter(attendee => {
    // Must be confirmed
    const isConfirmed = attendee.registration_status === 'confirmed' || attendee.registrationStatus === 'confirmed'
    if (!isConfirmed) return false

    // Exclude company filter if specified
    if (excludeCompany) {
      const attendeeCompany = attendee.company_name_standardized || attendee.company || ''
      if (attendeeCompany.toLowerCase() === excludeCompany.toLowerCase()) return false
    }

    // Search filter
    if (searchTerm.trim()) {
      const firstName = attendee.firstName || attendee.first_name || ''
      const lastName = attendee.lastName || attendee.last_name || ''
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      const email = (attendee.email || '').toLowerCase()
      const company = (attendee.company || '').toLowerCase()
      const title = (attendee.title || '').toLowerCase()
      
      const searchLower = searchTerm.toLowerCase()
      return fullName.includes(searchLower) || 
             email.includes(searchLower) || 
             company.includes(searchLower) ||
             title.includes(searchLower)
    }

    return true
  })

  // Exclude already selected attendees from dropdown
  const availableAttendees = filteredAttendees.filter(attendee => 
    !selectedAttendeeIds.includes(attendee.id)
  )

  // Get selected attendee objects
  const selectedAttendees = selectedAttendeeIds.map(id => 
    attendees.find(attendee => attendee.id === id)
  ).filter(Boolean)

  const handleAttendeeSelect = (attendee: any) => {
    if (selectedAttendeeIds.length >= maxSelections) {
      alert(`Maximum ${maxSelections} attendees can be selected`)
      return
    }

    const newSelection = [...selectedAttendeeIds, attendee.id]
    onSelectionChange(newSelection)
    setSearchTerm('')
    setShowDropdown(false)
    setFocusedIndex(-1)
  }

  const handleAttendeeRemove = (attendeeId: string) => {
    const newSelection = selectedAttendeeIds.filter(id => id !== attendeeId)
    onSelectionChange(newSelection)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || availableAttendees.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => 
          prev < availableAttendees.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : availableAttendees.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < availableAttendees.length) {
          handleAttendeeSelect(availableAttendees[focusedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setFocusedIndex(-1)
        break
    }
  }

  // Reset focused index when search term changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchTerm])

  return (
    <div className="space-y-4">
      {/* Selected Attendees Display */}
      {selectedAttendees.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-brand-navy mb-2">
            Selected Priority Networking Attendees ({selectedAttendees.length}/{maxSelections})
          </label>
          <div className="space-y-2">
            {selectedAttendees.map((attendee) => {
              const firstName = attendee.firstName || attendee.first_name
              const lastName = attendee.lastName || attendee.last_name
              
              return (
                <div
                  key={attendee.id}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900">
                        {firstName} {lastName}
                      </div>
                      <div className="text-xs text-blue-700">
                        {attendee.title} • {attendee.company}
                      </div>
                      {attendee.email && (
                        <div className="text-xs text-blue-600">
                          {attendee.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAttendeeRemove(attendee.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                    title="Remove from priority list"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      {selectedAttendeeIds.length < maxSelections && (
        <div className="relative">
          <label className="block text-sm font-semibold text-brand-navy mb-2">
            Add Priority Networking Attendees {excludeCompany && `(excluding ${excludeCompany})`}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
            <input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(e.target.value.length > 0)
              }}
              onFocus={() => setShowDropdown(searchTerm.length > 0)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
            />
            {selectedAttendeeIds.length >= maxSelections && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-brand-gray">
                Max {maxSelections} reached
              </div>
            )}
          </div>

          {/* Dropdown Results */}
          {showDropdown && searchTerm.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-navy mx-auto"></div>
                  <span className="text-sm text-brand-gray mt-2">Loading attendees...</span>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600 text-sm">
                  Error loading attendees: {error}
                </div>
              ) : availableAttendees.length > 0 ? (
                <div className="py-2">
                  {availableAttendees.slice(0, 10).map((attendee, index) => {
                    const firstName = attendee.firstName || attendee.first_name
                    const lastName = attendee.lastName || attendee.last_name
                    const isFocused = index === focusedIndex
                    
                    return (
                      <button
                        key={attendee.id}
                        onClick={() => handleAttendeeSelect(attendee)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isFocused ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-brand-gray" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-brand-navy">
                              {firstName} {lastName}
                            </div>
                            <div className="text-xs text-brand-gray truncate">
                              {attendee.title}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-brand-gray">
                              <Building className="w-3 h-3" />
                              <span className="truncate">{attendee.company}</span>
                            </div>
                            {attendee.email && (
                              <div className="flex items-center space-x-2 text-xs text-brand-gray">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{attendee.email}</span>
                              </div>
                            )}
                          </div>
                          <Plus className="w-4 h-4 text-brand-navy" />
                        </div>
                      </button>
                    )
                  })}
                  
                  {availableAttendees.length > 10 && (
                    <div className="px-4 py-2 text-xs text-brand-gray text-center border-t border-gray-100">
                      Showing first 10 of {availableAttendees.length} results. Refine search for more specific results.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-brand-gray text-sm">
                  {searchTerm.length > 0 ? 'No attendees found matching your search' : 'Start typing to search attendees'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="text-xs text-brand-gray">
        <p>
          <strong>Priority Networking:</strong> Select up to {maxSelections} attendees who should be prioritized for strategic seating arrangements.
          {excludeCompany && ` Excluding attendees from ${excludeCompany}.`}
        </p>
      </div>
    </div>
  )
}