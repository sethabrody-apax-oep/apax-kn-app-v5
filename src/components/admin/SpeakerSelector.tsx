import React, { useState, useEffect } from 'react'
import { Search, X, User, Building, Mail, Plus } from 'lucide-react'
import { useAttendees } from '../../hooks/useSupabaseData'

interface SpeakerSelectorProps {
  selectedSpeakerIds: string[]
  onSelectionChange: (speakerIds: string[]) => void
  placeholder?: string
}

export default function SpeakerSelector({
  selectedSpeakerIds,
  onSelectionChange,
  placeholder = "Search attendees to assign as speakers..."
}: SpeakerSelectorProps) {
  const { attendees, loading, error } = useAttendees()
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Filter attendees based on search term
  const filteredAttendees = attendees.filter(attendee => {
    // Must be confirmed
    const isConfirmed = attendee.registration_status === 'confirmed' || attendee.registrationStatus === 'confirmed'
    if (!isConfirmed) return false

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

  // Exclude already selected speakers from dropdown
  const availableAttendees = filteredAttendees.filter(attendee => 
    !selectedSpeakerIds.includes(attendee.id)
  )

  // Get selected speaker objects
  const selectedSpeakers = selectedSpeakerIds.map(id => 
    attendees.find(attendee => attendee.id === id)
  ).filter(Boolean)

  const handleSpeakerSelect = (attendee: any) => {
    const newSelection = [...selectedSpeakerIds, attendee.id]
    onSelectionChange(newSelection)
    setSearchTerm('')
    setShowDropdown(false)
    setFocusedIndex(-1)
  }

  const handleSpeakerRemove = (attendeeId: string) => {
    const newSelection = selectedSpeakerIds.filter(id => id !== attendeeId)
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
          handleSpeakerSelect(availableAttendees[focusedIndex])
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
      {/* Selected Speakers Display */}
      {selectedSpeakers.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-brand-navy mb-2">
            Assigned Speakers ({selectedSpeakers.length})
          </label>
          <div className="space-y-2">
            {selectedSpeakers.map((speaker, index) => {
              const firstName = speaker.firstName || speaker.first_name
              const lastName = speaker.lastName || speaker.last_name
              
              return (
                <div
                  key={speaker.id}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <img
                      src={speaker.photo || '/Apax_Favicon_32x32-1 copy.png'}
                      alt={`${firstName} ${lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-sm font-semibold text-blue-900">
                        {firstName} {lastName}
                      </div>
                      <div className="text-xs text-blue-700">
                        {speaker.title} • {speaker.company}
                      </div>
                      {speaker.email && (
                        <div className="text-xs text-blue-600">
                          {speaker.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSpeakerRemove(speaker.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                    title="Remove speaker"
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
      <div className="relative">
        <label className="block text-sm font-semibold text-brand-navy mb-2">
          Add Speakers
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
                      onClick={() => handleSpeakerSelect(attendee)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        isFocused ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={attendee.photo || '/Apax_Favicon_32x32-1 copy.png'}
                          alt={`${firstName} ${lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
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

      {/* Helper Text */}
      <div className="text-xs text-brand-gray">
        <p>
          <strong>Speaker Assignment:</strong> Search and select confirmed attendees to assign as speakers for this session.
          Speakers will be displayed in the order they are added.
        </p>
      </div>
    </div>
  )
}