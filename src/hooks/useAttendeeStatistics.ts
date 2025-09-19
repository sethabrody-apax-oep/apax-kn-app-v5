import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useDiningOptions } from './useSupabaseData'

export interface AttendeeStatistics {
  totalRegistrations: number
  softwareDay: number
  trackADigital: number
  trackBCfoOps: number
  welcomeDinner: number
  mapleAsh: number
}

export function useAttendeeStatistics() {
  const { diningOptions } = useDiningOptions()
  const [statistics, setStatistics] = useState<AttendeeStatistics>({
    totalRegistrations: 0,
    softwareDay: 0,
    trackADigital: 0,
    trackBCfoOps: 0,
    welcomeDinner: 0,
    mapleAsh: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all confirmed attendees with their breakout selections, dining selections, and spouse status
      const { data: attendees, error: supabaseError } = await supabase
        .from('attendees')
        .select('registration_status, selected_breakouts, dining_selections, spouse_details')
        .eq('registration_status', 'confirmed')

      if (supabaseError) {
        console.error('Error loading attendee statistics:', supabaseError)
        setError(supabaseError.message)
        return
      }

      const confirmedAttendees = attendees || []
      
      // Find specific dining events we're tracking
      const welcomeDinnerOption = diningOptions.find(option => 
        option.name.toLowerCase().includes('welcome') && option.name.toLowerCase().includes('dinner')
      )
      const mapleAshOption = diningOptions.find(option => 
        option.name.toLowerCase().includes('maple') && option.name.toLowerCase().includes('ash')
      )
      
      // Calculate statistics
      const stats: AttendeeStatistics = {
        totalRegistrations: confirmedAttendees.length,
        softwareDay: 0,
        trackADigital: 0,
        trackBCfoOps: 0,
        welcomeDinner: 0,
        mapleAsh: 0
      }

      // Process each attendee
      confirmedAttendees.forEach(attendee => {
        // Count breakout session selections
        const breakouts = attendee.selected_breakouts || []
        
        if (breakouts.includes('apax-software-ceo-summit')) {
          stats.softwareDay++
        }
        
        if (breakouts.includes('track-a-revenue-growth')) {
          stats.trackADigital++
        }
        
        if (breakouts.includes('track-b-operational-performance')) {
          stats.trackBCfoOps++
        }

        // Count dining selections
        const diningSelections = attendee.dining_selections
        
        // Safely check if diningSelections is an object
        if (diningSelections && typeof diningSelections === 'object' && !Array.isArray(diningSelections)) {
          // Check all dining selections for this attendee
          Object.entries(diningSelections).forEach(([eventKey, selection]: [string, any]) => {
            // Safely check if selection is valid and has attending property
            if (selection && typeof selection === 'object' && selection.attending === true) {
              
              // Check for Welcome Dinner - match against actual JSON keys and event names
              if (eventKey.includes('welcome-dinner') || 
                  (eventKey.includes('welcome') && eventKey.includes('dinner')) ||
                  (selection.eventName && selection.eventName.toLowerCase().includes('welcome') && selection.eventName.toLowerCase().includes('dinner'))) {
                stats.welcomeDinner++
              }
              
              // Check for Maple & Ash - match against actual JSON keys and event names
              if (eventKey.includes('maple-ash') || 
                  (eventKey.includes('maple') && eventKey.includes('ash')) ||
                  (selection.eventName && selection.eventName.toLowerCase().includes('maple') && selection.eventName.toLowerCase().includes('ash'))) {
                stats.mapleAsh++
              }
            }
          })
        }
      })

      setStatistics(stats)
    } catch (err) {
      console.error('Error calculating attendee statistics:', err)
      setError('Failed to calculate statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [])

  return {
    statistics,
    loading,
    error,
    refreshStatistics: loadStatistics
  }
}