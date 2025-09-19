import React from 'react'
import { Building, User, Award, Star, FileText, Users } from 'lucide-react'
import { getAttendeeCategoryColor, getAttendeeTypeIcon } from '../../utils/seatingColors'

interface SeatHoverModalProps {
  attendee: any
  position: { x: number; y: number }
  isVisible: boolean
  priorityNetworkingInfo?: {
    isPriorityNetworking: boolean
    seatingNotes: string
    companyName: string
    priorityNetworkingAttendeeIds: string[]
  }
  companiesWithSeatingRequests?: any[]
  allAttendees?: any[]
}

export default function SeatHoverModal({ 
  attendee, 
  position, 
  isVisible, 
  priorityNetworkingInfo,
  companiesWithSeatingRequests = [],
  allAttendees = []
}: SeatHoverModalProps) {
  if (!isVisible || !attendee) return null

  // Defensive coding to ensure arrays are always available
  const safeCompaniesWithSeatingRequests = companiesWithSeatingRequests || []
  const safeAllAttendees = allAttendees || []

  const firstName = attendee?.firstName || attendee?.first_name
  const lastName = attendee?.lastName || attendee?.last_name
  
  // Get company seating data
  const attendeeCompany = attendee?.company_name_standardized || attendee?.company
  const companySeatingData = safeCompaniesWithSeatingRequests.find(
    company => company.companyName === attendeeCompany
  )
  
  // Get priority networking attendees for this company
  const priorityNetworkingAttendees = companySeatingData?.priorityNetworkingAttendees || []
  const priorityAttendeeDetails = priorityNetworkingAttendees
    .map(attendeeId => safeAllAttendees.find(a => a.id === attendeeId))
    .filter(Boolean)
  
  const getAttendeeTypeLabel = (type: string) => {
    switch (type) {
      case 'IP': return 'Apax IP'
      case 'OEP': return 'Apax OEP'
      case 'V': return 'Sponsor'
      case 'P': return 'Portfolio Executive'
      case 'S': return 'Speaker'
      case 'C': return 'CEO'
      default: return 'Other'
    }
  }

  const attendeeType = getAttendeeTypeIcon(attendee.attributes) // This function remains to get the text for the circle
  const colorInfo = getAttendeeCategoryColor(attendee, priorityNetworkingInfo?.isPriorityNetworking); // Get the full color info

  // Enhanced modal positioning with better boundary detection
  const modalWidth = 320
  const modalHeight = priorityNetworkingInfo?.isPriorityNetworking ? 200 : 140
  const screenPadding = 20
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate initial position (centered above the seat)
  let modalX = position.x - (modalWidth / 2)
  let modalY = position.y - modalHeight - 15
  
  // Horizontal boundary adjustments
  if (modalX + modalWidth > viewportWidth - screenPadding) {
    modalX = viewportWidth - modalWidth - screenPadding
  }
  if (modalX < screenPadding) {
    modalX = screenPadding
  }
  
  // Vertical boundary adjustments
  if (modalY < screenPadding) {
    // Position below the seat if no room above
    modalY = position.y + 45
  }
  if (modalY + modalHeight > viewportHeight - screenPadding) {
    modalY = viewportHeight - modalHeight - screenPadding
  }

  return (
    <div 
      className="fixed z-[80] bg-white border border-gray-200 rounded-lg shadow-xl p-4 pointer-events-none"
      style={{
        left: modalX,
        top: modalY,
        width: modalWidth
      }}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${colorInfo.bgColor} ${colorInfo.textColor}`}>
          {attendeeType}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-brand-navy truncate">
            {firstName} {lastName}
            {attendee.isSpouse && (
              <span className="ml-1 text-sm text-purple-600 font-normal">(Spouse)</span>
            )}
            {priorityNetworkingInfo?.isPriorityNetworking && (
              <Star className="w-4 h-4 inline ml-1 text-yellow-500" />
            )}
          </h4>
          <p className="text-sm text-brand-gray truncate">
            {attendee.title}
          </p>
          <div className="flex items-center text-brand-gray mt-1">
            <Building className="w-3 h-3 mr-1" />
            <span className="text-xs truncate">{attendee.company}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <Award className="w-3 h-3 text-brand-gray" />
          <span className="text-xs font-semibold text-brand-navy">
            {getAttendeeTypeLabel(attendeeType)}
          </span>
        </div>
        
        {/* Secondary attribute icons */}
        <div className="flex items-center space-x-1 mt-2">
          {attendee.isSpouse && ( // Keep spouse icon as it's a secondary attribute
            <div className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">S</div>
          )}
          {priorityNetworkingInfo?.isPriorityNetworking && (
            <div className="w-4 h-4 rounded-full bg-yellow-500 text-white flex items-center justify-center">
              <Star className="w-2 h-2" />
            </div>
          )}
          {/* Other attribute icons removed as their primary category is now reflected in the main color */}
        </div>
        
        {/* Priority networking info */}
        {priorityNetworkingInfo?.isPriorityNetworking && (
          <div className="mt-2 text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span className="font-semibold">Priority Networking Request</span>
            </div>
            {priorityNetworkingInfo.seatingNotes && (
              <div className="mt-1 text-xs text-yellow-700">
                <FileText className="w-3 h-3 inline mr-1" />
                Company has seating notes
              </div>
            )}
          </div>
        )}
        
        {/* Company seating notes */}
        {companySeatingData?.seatingNotes && companySeatingData.seatingNotes.trim() && (
          <div className="mt-2 text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">
            <div className="flex items-center space-x-1 mb-1">
              <FileText className="w-3 h-3" />
              <span className="font-semibold">Company Seating Notes</span>
            </div>
            <div className="text-xs text-blue-700 max-h-16 overflow-y-auto">
              {companySeatingData.seatingNotes.length > 100 
                ? `${companySeatingData.seatingNotes.substring(0, 100)}...` 
                : companySeatingData.seatingNotes}
            </div>
          </div>
        )}
        
        {/* Priority networking attendees for this company */}
        {priorityAttendeeDetails.length > 0 && (
          <div className="mt-2 text-xs text-green-800 bg-green-100 px-2 py-1 rounded">
            <div className="flex items-center space-x-1 mb-1">
              <Users className="w-3 h-3" />
              <span className="font-semibold">Priority Networking ({priorityAttendeeDetails.length})</span>
            </div>
            <div className="space-y-1">
              {priorityAttendeeDetails.map((priorityAttendee) => {
                const pFirstName = priorityAttendee.firstName || priorityAttendee.first_name
                const pLastName = priorityAttendee.lastName || priorityAttendee.last_name
                return (
                  <div key={priorityAttendee.id} className="text-xs text-green-700">
                    {pFirstName} {pLastName} ({priorityAttendee.title})
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        {attendee.dietary_requirements && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
            Dietary needs: {attendee.dietary_requirements}
          </div>
        )}
      </div>
    </div>
  )
}