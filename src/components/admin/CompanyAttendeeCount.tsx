import React, { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface CompanyAttendeeCountProps {
  companyName: string
  companyId: string
}

export default function CompanyAttendeeCount({ companyName, companyId }: CompanyAttendeeCountProps) {
  const [attendeeCount, setAttendeeCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAttendeeCount()
  }, [companyName, companyId])

  const loadAttendeeCount = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Query attendees table for confirmed attendees matching this company
      const { data, error: supabaseError } = await supabase
        .from('attendees')
        .select('id')
        .eq('registration_status', 'confirmed')
        .or(`company.eq.${companyName},company_name_standardized.eq.${companyName}`)

      if (supabaseError) {
        console.error('Error loading attendee count for company:', companyName, supabaseError)
        setError(supabaseError.message)
        setAttendeeCount(0)
      } else {
        setAttendeeCount(data?.length || 0)
      }
    } catch (err) {
      console.error('Error loading attendee count:', err)
      setError('Failed to load count')
      setAttendeeCount(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-1 text-brand-gray">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-navy"></div>
        <span className="text-xs">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-600">
        Error
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1">
      <Users className="w-4 h-4 text-brand-gray" />
      <span className="text-sm font-semibold text-brand-navy">
        {attendeeCount}
      </span>
    </div>
  )
}