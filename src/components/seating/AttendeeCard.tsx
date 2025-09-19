import React from 'react'
import { useDrag } from 'react-dnd'
import { getAttendeeCategoryColor, getAttendeeTypeIcon } from '../../utils/seatingColors'
import { Star, FileText } from 'lucide-react'

interface AttendeeCardProps {
  attendee: any
  isPriorityNetworking?: boolean
  companySeatingNotes?: string
 priorityNetworkingInfo?: any
 companiesWithSeatingRequests?: any[]
 allEligibleAttendees?: any[]
  onClick: () => void
}

export default function AttendeeCard({ 
  attendee, 
  isPriorityNetworking = false,
  companySeatingNotes,
 priorityNetworkingInfo,
 companiesWithSeatingRequests = [],
 allEligibleAttendees = [],
  onClick
}: AttendeeCardProps) {
  const [showSeatingModal, setShowSeatingModal] = React.useState(false)
  const [modalPosition, setModalPosition] = React.useState({ x: 0, y: 0 })

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'attendee',
    item: { attendee },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      console.log('Finished dragging attendee:', attendee, 'Drop result:', dropResult)
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const attendeeType = getAttendeeTypeIcon(attendee.attributes) // This function remains to get the text for the circle
  const colorInfo = getAttendeeCategoryColor(attendee, isPriorityNetworking); // Get the full color info
  const firstName = attendee.firstName || attendee.first_name
  const lastName = attendee.lastName || attendee.last_name

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (companySeatingNotes && companySeatingNotes.trim()) {
      const rect = e.currentTarget.getBoundingClientRect()
      setModalPosition({
        x: rect.right + 10,
        y: rect.top
      })
      setShowSeatingModal(true)
    }
  }

  const handleMouseLeave = () => {
    setShowSeatingModal(false)
  }

  return (
    <>
      <div
        ref={drag}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`bg-white border rounded-lg p-4 transition-all duration-200 cursor-grab hover:shadow-md hover:bg-gray-50 ${
          isPriorityNetworking ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
        } ${
          companySeatingNotes && companySeatingNotes.trim() ? 'border-blue-300 bg-blue-50' : ''
        } ${
          isDragging ? 'opacity-50 cursor-grabbing' : ''
        }`}
      >
        <div className="flex items-start space-x-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-semibold text-brand-navy">
              {firstName} {lastName}
            </h4>
              <div className="flex items-center space-x-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                  {attendeeType}
                </div>
                {isPriorityNetworking && (
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center" title="Priority Networking">
                    <Star className="w-3 h-3" />
                  </div>
                )}
                {(attendee.isSpouse || attendee.is_spouse) && (
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold">
                    S
                  </div>
                )}
                {companySeatingNotes && companySeatingNotes.trim() && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center" title="Company has seating requests">
                    <FileText className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-brand-gray">
              {attendee.title}
            </p>
            <p className="text-xs text-brand-gray">
              {attendee.company}
            </p>
          </div>
        </div>
        
        {/* Dietary indicator */}
        {(attendee.dietary_requirements || attendee.dietaryRequirements) && (
          <div className="mt-3 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
            Dietary needs
          </div>
        )}
        
        {/* Priority networking indicator */}
        {isPriorityNetworking && (
          <div className="mt-3 text-xs text-yellow-800 bg-yellow-200 px-2 py-1 rounded font-semibold">
            Priority Networking
          </div>
        )}
        
        {/* Company seating requests indicator */}
        {companySeatingNotes && companySeatingNotes.trim() && (
          <div className="mt-3 text-xs text-blue-800 bg-blue-200 px-2 py-1 rounded font-semibold">
            Company Seating Requests
          </div>
        )}
      </div>

      {/* Seating Requests Modal */}
      {showSeatingModal && companySeatingNotes && (
        <div 
          className="fixed z-[90] bg-white border border-gray-200 rounded-lg shadow-xl p-4 pointer-events-none max-w-md"
          style={{
            left: modalPosition.x,
            top: modalPosition.y
          }}
        >
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="text-md font-semibold text-blue-900">
              {attendee.company} - Seating Requests
            </h4>
          </div>
          
          {companySeatingNotes && companySeatingNotes.trim() && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
              <h5 className="text-sm font-semibold text-blue-900 mb-2">Seating Notes:</h5>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">
                {companySeatingNotes}
              </p>
            </div>
          )}
          
         {/* Priority Networking Attendees */}
         {(() => {
           const attendeeCompany = attendee.company_name_standardized || attendee.company
           const companyData = companiesWithSeatingRequests.find(
             company => company.companyName === attendeeCompany
           )
           const priorityAttendeeIds = companyData?.priorityNetworkingAttendees || []
           const priorityAttendeeDetails = priorityAttendeeIds
             .map(attendeeId => allEligibleAttendees.find(a => a.id === attendeeId))
             .filter(Boolean)
           
           if (priorityAttendeeDetails.length > 0) {
             return (
               <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                 <h5 className="text-sm font-semibold text-green-900 mb-2">
                   Priority Networking Attendees ({priorityAttendeeDetails.length}):
                 </h5>
                 <div className="space-y-1">
                   {priorityAttendeeDetails.map((priorityAttendee) => {
                     const pFirstName = priorityAttendee.firstName || priorityAttendee.first_name
                     const pLastName = priorityAttendee.lastName || priorityAttendee.last_name
                     return (
                       <div key={priorityAttendee.id} className="text-sm text-green-800">
                         <span className="font-semibold">{pFirstName} {pLastName}</span>
                         <span className="text-green-700"> - {priorityAttendee.title}</span>
                       </div>
                     )
                   })}
                 </div>
               </div>
             )
           }
           return null
         })()}
         
          <div className="mt-3 text-xs text-blue-700">
            <strong>Tip:</strong> Consider these requests when assigning seating for optimal networking and business development opportunities.
          </div>
        </div>
      )}
    </>
  )
}