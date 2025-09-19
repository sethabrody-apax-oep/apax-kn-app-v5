import React from 'react'
import { Building, User, Award, Crown, Mail, Phone } from 'lucide-react'

interface ApaxAttendeeHoverModalProps {
  subcategoryType: 'ip' | 'ep' | 'oep' | 'other'
  attendees: any[]
  position: { x: number; y: number }
  isVisible: boolean
}

export default function ApaxAttendeeHoverModal({ 
  subcategoryType, 
  attendees, 
  position, 
  isVisible 
}: ApaxAttendeeHoverModalProps) {
  if (!isVisible || !attendees) return null

  const getSubcategoryTitle = (type: string) => {
    switch (type) {
      case 'ip': return 'Apax IP Attendees'
      case 'ep': return 'Apax EP Attendees'
      case 'oep': return 'Apax OEP Attendees'
      case 'other': return 'Other Apax Attendees'
      default: return 'Apax Attendees'
    }
  }

  const getSubcategoryColor = (type: string) => {
    switch (type) {
      case 'ip': return 'border-purple-400 bg-purple-50'
      case 'ep': return 'border-purple-800 bg-purple-100'
      case 'oep': return 'border-green-500 bg-green-50'
      case 'other': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  const getAttendeeTypeIcon = (attendee: any) => {
    if (attendee.is_spouse) return 'S'
    if (attendee.attributes?.apaxIP) return 'IP'
    if (attendee.attributes?.apaxEP || attendee.is_apax_ep) return 'EP'
    if (attendee.attributes?.apaxOEP) return 'OEP'
    if (attendee.attributes?.ceo) return 'C'
    if (attendee.attributes?.cfo || attendee.is_cfo) return 'F'
    if (attendee.attributes?.sponsorAttendee) return 'V'
    if (attendee.attributes?.portfolioCompanyExecutive) return 'P'
    return 'A'
  }

  const getAttendeeTypeColor = (attendee: any) => {
    if (attendee.is_spouse) return 'bg-purple-500 text-white'
    if (attendee.attributes?.apaxIP) return 'bg-light-purple text-white'
    if (attendee.attributes?.apaxEP || attendee.is_apax_ep) return 'bg-dark-purple text-white'
    if (attendee.attributes?.apaxOEP) return 'bg-chart-green text-white'
    if (attendee.attributes?.ceo) return 'bg-chart-red text-white'
    if (attendee.attributes?.cfo || attendee.is_cfo) return 'bg-blue-600 text-white'
    if (attendee.attributes?.sponsorAttendee) return 'bg-sector-tech text-white'
    if (attendee.attributes?.portfolioCompanyExecutive) return 'bg-sector-services text-white'
    return 'bg-brand-gray text-white'
  }

  // Enhanced modal positioning with better boundary detection
  const modalWidth = 320
  const baseHeight = 120
  const attendeeHeight = 50
  const modalHeight = Math.min(600, baseHeight + (attendees.length * attendeeHeight))
  const screenPadding = 20
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate initial position (to the right of the hovered item)
  let modalX = position.x + 10
  let modalY = position.y - (modalHeight / 2)
  
  // Horizontal boundary adjustments
  if (modalX + modalWidth > viewportWidth - screenPadding) {
    // Position to the left of the hovered item if no room on the right
    modalX = position.x - modalWidth - 10
  }
  if (modalX < screenPadding) {
    modalX = screenPadding
  }
  
  // Vertical boundary adjustments
  if (modalY < screenPadding) {
    modalY = screenPadding
  }
  if (modalY + modalHeight > viewportHeight - screenPadding) {
    modalY = viewportHeight - modalHeight - screenPadding
  }

  return (
    <div 
      className={`fixed z-50 bg-white border-2 rounded-lg shadow-xl p-4 pointer-events-none ${getSubcategoryColor(subcategoryType)}`}
      style={{
        left: modalX,
        top: modalY,
        width: modalWidth
      }}
    >
      <div className="flex items-center space-x-2 mb-3">
        <Award className="w-5 h-5 text-brand-navy" />
        <div>
          <h4 className="text-md font-semibold text-brand-navy">
            {getSubcategoryTitle(subcategoryType)}
          </h4>
          <p className="text-xs text-brand-gray">
            {attendees.length} confirmed attendee{attendees.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {attendees.length > 0 ? (
        <div className="space-y-2">
          {attendees.map((attendee) => (
            <div key={attendee.id} className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getAttendeeTypeColor(attendee)}`}>
                {getAttendeeTypeIcon(attendee)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-brand-navy">
                  {attendee.first_name || attendee.firstName || 'Unknown'} {attendee.last_name || attendee.lastName || 'Name'}
                </div>
                <div className="text-xs text-brand-gray truncate">
                  {attendee.title || 'No title'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <User className="w-8 h-8 text-brand-gray mx-auto mb-2 opacity-50" />
          <p className="text-sm text-brand-gray">
            No attendees found in this subcategory
          </p>
        </div>
      )}
    </div>
  )
}