import React, { useState, useEffect } from 'react'
import { Users, FileText, Save, X, AlertCircle } from 'lucide-react'
import AttendeeSearchSelector from './AttendeeSearchSelector'
import { useAttendees } from '../../hooks/useSupabaseData'

interface SeatingRequestsSectionProps {
  seatingNotes: string
  priorityNetworkingAttendees: string[]
  companyName?: string
  onSeatingNotesChange: (notes: string) => void
  onPriorityAttendeesChange: (attendeeIds: string[]) => void
  isEditing?: boolean
}

export default function SeatingRequestsSection({
  seatingNotes,
  priorityNetworkingAttendees,
  companyName,
  onSeatingNotesChange,
  onPriorityAttendeesChange,
  isEditing = true
}: SeatingRequestsSectionProps) {
  const { attendees } = useAttendees()
  const [localSeatingNotes, setLocalSeatingNotes] = useState(seatingNotes)
  const [localPriorityAttendees, setLocalPriorityAttendees] = useState(priorityNetworkingAttendees)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Synchronize local state with props when they change
  useEffect(() => {
    setLocalSeatingNotes(seatingNotes)
    setLocalPriorityAttendees(priorityNetworkingAttendees)
    setHasUnsavedChanges(false)
  }, [seatingNotes, priorityNetworkingAttendees])

  const handleSeatingNotesChange = (notes: string) => {
    setLocalSeatingNotes(notes)
    setHasUnsavedChanges(true)
    onSeatingNotesChange(notes)
  }

  const handlePriorityAttendeesChange = (attendeeIds: string[]) => {
    setLocalPriorityAttendees(attendeeIds)
    setHasUnsavedChanges(true)
    onPriorityAttendeesChange(attendeeIds)
  }

  const handleReset = () => {
    setLocalSeatingNotes(seatingNotes)
    setLocalPriorityAttendees(priorityNetworkingAttendees)
    setHasUnsavedChanges(false)
    onSeatingNotesChange(seatingNotes)
    onPriorityAttendeesChange(priorityNetworkingAttendees)
  }

  if (!isEditing && !seatingNotes && priorityNetworkingAttendees.length === 0) {
    return null // Don't show empty section in view mode
  }

  // Get priority attendee details for view mode
  const priorityAttendeeDetails = priorityNetworkingAttendees
    .map(attendeeId => attendees.find(a => a.id === attendeeId))
    .filter(Boolean)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2" />
        Conference Seating & Business Development Requests
      </h3>
      
      {isEditing ? (
        <div className="space-y-6">
          {/* Seating Notes */}
          <div>
            <label className="block text-sm font-semibold text-brand-navy mb-2">
              Seating and Business Development Notes
            </label>
            <textarea
              value={localSeatingNotes}
              onChange={(e) => handleSeatingNotesChange(e.target.value)}
              rows={6}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
              placeholder="Enter any specific seating requests, business development opportunities, or strategic networking notes for this company. This information will be available to seating managers to help optimize table assignments and networking opportunities.

Examples:
• Request seating near Apax Digital portfolio companies
• Priority networking with healthcare sector companies
• Avoid seating near competitors in the fintech space
• Strategic introduction opportunities with specific executives
• Special accommodation requests or preferences"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-brand-gray">
                No character limit. This information will be available during seating management.
              </p>
              <span className="text-xs text-brand-gray">
                {localSeatingNotes.length} characters
              </span>
            </div>
          </div>

          {/* Priority Networking Attendees */}
          <div>
            <AttendeeSearchSelector
              selectedAttendeeIds={localPriorityAttendees}
              onSelectionChange={handlePriorityAttendeesChange}
              maxSelections={5}
              placeholder="Search for attendees to prioritize for networking..."
              excludeCompany={companyName} // Exclude same company attendees for networking
            />
          </div>

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    You have unsaved changes to seating requests
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                >
                  Reset Changes
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // View Mode
        <div className="space-y-4">
          {seatingNotes && (
            <div>
              <h4 className="text-sm font-semibold text-brand-navy mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                Seating Notes
              </h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-brand-gray whitespace-pre-wrap">
                  {seatingNotes}
                </p>
              </div>
            </div>
          )}

          {priorityNetworkingAttendees.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-brand-navy mb-2 flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Priority Networking Attendees ({priorityNetworkingAttendees.length})
              </h4>
              <div className="space-y-3">
                {priorityAttendeeDetails.map((attendee) => {
                  const firstName = attendee.firstName || attendee.first_name
                  const lastName = attendee.lastName || attendee.last_name
                  
                  return (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Users className="w-4 h-4 text-blue-600" />
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">How This Helps Seating Management:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Strategic Seating:</strong> Notes guide seating managers on optimal table placements</li>
          <li>• <strong>Priority Networking:</strong> Selected attendees get visual indicators in seating interface</li>
          <li>• <strong>Business Development:</strong> Facilitates strategic introductions and relationship building</li>
          {companyName && (
            <li>• <strong>External Focus:</strong> Excluding attendees from {companyName} to focus on external networking opportunities</li>
          )}
        </ul>
      </div>
    </div>
  )
}