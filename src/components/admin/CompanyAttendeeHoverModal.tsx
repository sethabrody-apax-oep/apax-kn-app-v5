import React, { useState, useEffect } from 'react'
import { Building, User, Award, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface CompanyAttendeeHoverModalProps {
  companyName: string
  position: { x: number; y: number }
  isVisible: boolean
  fundCategory?: 'buyout' | 'digital' | 'impact' | 'sponsors' | 'apax' | 'no-attendees'
}

export default function CompanyAttendeeHoverModal({ 
  companyName, 
  position, 
  isVisible,
  fundCategory = 'buyout'
}: CompanyAttendeeHoverModalProps) {
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isVisible && companyName) {
      loadCompanyAttendees()
    }
  }, [isVisible, companyName])

  const loadCompanyAttendees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, title, attributes, is_spouse, is_cfo, is_apax_ep')
        .or(`company.eq.${companyName},company_name_standardized.eq.${companyName}`)
        .eq('registration_status', 'confirmed')
        .order('first_name', { ascending: true })

      if (supabaseError) {
        console.error('Error loading company attendees:', supabaseError)
        setError(supabaseError.message)
        setAttendees([])
      } else {
        setAttendees(data || [])
      }
    } catch (err) {
      console.error('Error loading attendees:', err)
      setError('Failed to load attendees')
      setAttendees([])
    } finally {
      setLoading(false)
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'buyout': return 'border-blue-500 bg-blue-50'
      case 'digital': return 'border-purple-500 bg-purple-50'
      case 'impact': return 'border-green-500 bg-green-50'
      case 'sponsors': return 'border-orange-500 bg-orange-50'
      case 'apax': return 'border-indigo-500 bg-indigo-50'
      case 'no-attendees': return 'border-gray-500 bg-gray-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'buyout': return 'Buyout Fund Company'
      case 'digital': return 'Digital Fund Company'
      case 'impact': return 'Impact & Other Fund Company'
      case 'sponsors': return 'Sponsor Company'
      case 'apax': return 'Apax Company'
      case 'no-attendees': return 'Company with No Attendees'
      default: return 'Company'
    }
  }

  if (!isVisible) return null

  // Enhanced modal positioning with better boundary detection
  const modalWidth = 320
  const baseHeight = 120
  const attendeeHeight = 50 // Reduced from 60px since we removed email/phone
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
      className={`fixed z-50 bg-white border-2 rounded-lg shadow-xl p-4 pointer-events-none ${getCategoryColor(fundCategory)}`}
      style={{
        left: modalX,
        top: modalY,
        width: modalWidth
      }}
    >
      <div className="flex items-center space-x-2 mb-3">
        <Building className="w-5 h-5 text-brand-navy" />
        <div>
          <h4 className="text-md font-semibold text-brand-navy">
            {companyName}
          </h4>
          <p className="text-xs text-brand-gray">
            {getCategoryTitle(fundCategory)}
          </p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-navy"></div>
          <span className="ml-2 text-brand-navy text-sm">Loading...</span>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      ) : attendees.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-brand-navy mb-2">
            Confirmed Attendees ({attendees.length}):
          </div>
          {attendees.map((attendee) => (
            <div key={attendee.id} className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getAttendeeTypeColor(attendee)}`}>
                {getAttendeeTypeIcon(attendee)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-brand-navy">
                  {attendee.first_name} {attendee.last_name}
                </div>
                <div className="text-xs text-brand-gray truncate">
                  {attendee.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <User className="w-8 h-8 text-brand-gray mx-auto mb-2 opacity-50" />
          <p className="text-sm text-brand-gray">
            No attendees found for this company
          </p>
        </div>
      )}
    </div>
  )
}