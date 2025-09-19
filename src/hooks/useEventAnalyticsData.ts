import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { standardizeFundAffiliation, type CanonicalFundAffiliation } from '../utils/fundAffiliationUtils'

export interface EventAnalyticsData {
  // Overall attendance statistics
  totalRegistrations: number
  totalSpouses: number
  softwareDay: number
  trackADigital: number
  trackBCfoOps: number
  welcomeDinner: number
  mapleAsh: number
  
  // Assigned seating events with capacity tracking
  assignedSeatingEvents: Array<{
    id: string
    name: string
    type: 'agenda' | 'dining'
    date: string
    time: string
    location: string
    registeredCount: number
    capacity: number | null
  }>
  
  // Hotel selections summary (specific hotels we track)
  fourSeasonsCount: number
  parkHyattCount: number
  makingOwnArrangementsCount: number
  
  // Portfolio Company C-Level counts
  portfolioCeoCount: number
  portfolioCfoCount: number
  portfolioCooCount: number
  portfolioCioCtoCount: number
  portfolioCmoCount: number
  
  // Companies with no attendees
  companiesWithNoAttendees: Array<{
    companyName: string
    logo?: string
    sector: string
    geography: string
  }>
  
  // Attendees by company category
  attendeesByCompanyCategory: {
    apaxAttendees: {
      apaxIP: number
      apaxEP: number
      apaxOEP: number
      apaxOther: number
      apaxCompaniesCount: number
      apaxIPAttendeesList: any[]
      apaxEPAttendeesList: any[]
      apaxOEPAttendeesList: any[]
      apaxOtherAttendeesList: any[]
    }
    buyoutFunds: Array<{
      companyName: string
      logo?: string
      attendeeCount: number
    }>
    digitalFunds: Array<{
      companyName: string
      logo?: string
      attendeeCount: number
    }>
    impactAndOther: Array<{
      companyName: string
      logo?: string
      attendeeCount: number
    }>
    sponsors: Array<{
      companyName: string
      logo?: string
      attendeeCount: number
    }>
  }
}

export function useEventAnalyticsData() {
  const [analyticsData, setAnalyticsData] = useState<EventAnalyticsData>({
    totalRegistrations: 0,
    totalSpouses: 0,
    softwareDay: 0,
    trackADigital: 0,
    trackBCfoOps: 0,
    welcomeDinner: 0,
    mapleAsh: 0,
    assignedSeatingEvents: [],
    fourSeasonsCount: 0,
    parkHyattCount: 0,
    makingOwnArrangementsCount: 0,
    portfolioCeoCount: 0,
    portfolioCfoCount: 0,
    portfolioCooCount: 0,
    portfolioCioCtoCount: 0,
    portfolioCmoCount: 0,
    companiesWithNoAttendees: [],
    attendeesByCompanyCategory: {
      apaxAttendees: {
        apaxIP: 0,
        apaxEP: 0,
        apaxOEP: 0,
        apaxOther: 0,
        apaxCompaniesCount: 0,
        apaxIPAttendeesList: [],
        apaxEPAttendeesList: [],
        apaxOEPAttendeesList: [],
        apaxOtherAttendeesList: []
      },
      buyoutFunds: [],
      digitalFunds: [],
      impactAndOther: [],
      sponsors: []
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEventAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all confirmed attendees with their selections
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, title, registration_status, selected_breakouts, dining_selections, hotel_selection, spouse_details, has_spouse, company, company_name_standardized, attributes, is_apax_ep, is_cfo')
        .eq('registration_status', 'confirmed')

      if (attendeesError) {
        throw new Error(`Failed to load attendees: ${attendeesError.message}`)
      }

      const confirmedAttendees = attendees || []
      
      // Load standardized companies to get logos
      const { data: companies, error: companiesError } = await supabase
        .from('standardized_companies')
        .select('name, logo, fund_analytics_category')

      if (companiesError) {
        throw new Error(`Failed to load companies: ${companiesError.message}`)
      }

      // Create company logo lookup map
      const companyLogoMap = new Map<string, string>()
      ;(companies || []).forEach(company => {
        if (company.logo) {
          companyLogoMap.set(company.name.toLowerCase(), company.logo)
        }
      })

      // Load companies with attendee counts to find companies with no attendees
      const { data: companiesWithCounts, error: companiesCountError } = await supabase
        .rpc('get_companies_by_attendee_count', { limit_count: 1000 })

      if (companiesCountError) {
        console.warn('Failed to load companies with counts:', companiesCountError.message)
      }

      // Find companies with zero attendees
      const companiesWithNoAttendees = (companiesWithCounts || [])
        .filter(company => company.attendee_count === 0)
        .map(company => ({
          companyName: company.company_name,
          logo: companyLogoMap.get(company.company_name.toLowerCase()),
          sector: company.sector,
          geography: company.geography
        }))
        .sort((a, b) => a.companyName.localeCompare(b.companyName))

      // Load hotels to get canonical names and IDs
      const { data: hotels, error: hotelsError } = await supabase
        .from('hotels')
        .select('id, name')
        .eq('is_active', true)

      if (hotelsError) {
        throw new Error(`Failed to load hotels: ${hotelsError.message}`)
      }

      // Find specific hotels we're tracking
      const fourSeasonsHotel = (hotels || []).find(hotel => 
        hotel.name.toLowerCase().includes('four seasons')
      )
      const parkHyattHotel = (hotels || []).find(hotel => 
        hotel.name.toLowerCase().includes('park hyatt')
      )

      // Load dining options to get canonical names and IDs
      const { data: diningOptions, error: diningError } = await supabase
        .from('dining_options')
        .select('id, name')
        .eq('is_active', true)

      if (diningError) {
        throw new Error(`Failed to load dining options: ${diningError.message}`)
      }

      // Create lookup maps for dining options
      const diningOptionsMap = new Map()
      const diningNameToId = new Map()
      
      ;(diningOptions || []).forEach(option => {
        diningOptionsMap.set(option.id, option.name)
        diningNameToId.set(option.name.toLowerCase(), option.id)
        
        // Also create slugified versions for matching
        const slugified = option.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
        diningNameToId.set(slugified, option.id)
      })

      // Find specific dining events we're tracking
      const welcomeDinnerOption = (diningOptions || []).find(option => 
        option.name.toLowerCase().includes('welcome') && option.name.toLowerCase().includes('dinner')
      )
      const mapleAshOption = (diningOptions || []).find(option => 
        option.name.toLowerCase().includes('maple') && option.name.toLowerCase().includes('ash')
      )

      // Calculate basic attendance statistics
      const basicStats = {
        totalRegistrations: confirmedAttendees.length,
        totalSpouses: 0,
        softwareDay: 0,
        trackADigital: 0,
        trackBCfoOps: 0,
        welcomeDinner: 0,
        mapleAsh: 0,
        fourSeasonsCount: 0,
        parkHyattCount: 0,
        makingOwnArrangementsCount: 0,
        portfolioCeoCount: 0,
        portfolioCfoCount: 0,
        portfolioCooCount: 0,
        portfolioCioCtoCount: 0,
        portfolioCmoCount: 0
      }

      // Initialize company category data structures
      const apaxAttendees = {
        apaxIP: 0,
        apaxEP: 0,
        apaxOEP: 0,
        apaxOther: 0,
        apaxCompaniesCount: 0,
        apaxIPAttendeesList: [] as any[],
        apaxEPAttendeesList: [] as any[],
        apaxOEPAttendeesList: [] as any[],
        apaxOtherAttendeesList: [] as any[]
      }
      
      const buyoutFundsMap = new Map<string, number>()
      const digitalFundsMap = new Map<string, number>()
      const impactAndOtherMap = new Map<string, number>()
      const sponsorsMap = new Map<string, number>()
      
      // Track companies with Apax attendees
      const apaxCompaniesSet = new Set<string>()
      
      // Create a map of company names to their analytics categories
      const companyAnalyticsCategoryMap = new Map<string, string>()
      ;(companies || []).forEach(company => {
        companyAnalyticsCategoryMap.set(company.name.toLowerCase(), company.fund_analytics_category || 'Other Funds')
      })

      // Process each attendee for breakout and dining selections
      confirmedAttendees.forEach(attendee => {
        const companyName = attendee.company_name_standardized || attendee.company || 'Unknown Company'
        const attributes = attendee.attributes || {}
        
        // Get the analytics category for this company from the standardized_companies table
        const analyticsCategory = companyAnalyticsCategoryMap.get(companyName.toLowerCase()) || 'Other Funds'
        
        // Count Apax attendees
        if (attributes.apaxIP) {
          apaxAttendees.apaxIP++
          apaxAttendees.apaxIPAttendeesList.push({
            id: attendee.id,
            first_name: attendee.first_name,
            last_name: attendee.last_name,
            title: attendee.title,
            company: attendee.company,
            attributes: attendee.attributes
          })
          apaxCompaniesSet.add(companyName)
        } else if (attributes.apaxEP) {
          apaxAttendees.apaxEP++
          apaxAttendees.apaxEPAttendeesList.push({
            id: attendee.id,
            first_name: attendee.first_name,
            last_name: attendee.last_name,
            title: attendee.title,
            company: attendee.company,
            attributes: attendee.attributes
          })
          apaxCompaniesSet.add(companyName)
        } else if (attributes.apaxOEP) {
          apaxAttendees.apaxOEP++
          apaxAttendees.apaxOEPAttendeesList.push({
            id: attendee.id,
            first_name: attendee.first_name,
            last_name: attendee.last_name,
            title: attendee.title,
            company: attendee.company,
            attributes: attendee.attributes
          })
          apaxCompaniesSet.add(companyName)
        } else if (attributes.apaxOther) {
          apaxAttendees.apaxOther++
          apaxAttendees.apaxOtherAttendeesList.push({
            id: attendee.id,
            first_name: attendee.first_name,
            last_name: attendee.last_name,
            title: attendee.title,
            company: attendee.company,
            attributes: attendee.attributes
          })
          apaxCompaniesSet.add(companyName)
        }
        
        // Count Portfolio Company C-Level executives
        if (attributes.portfolioCompanyExecutive) {
          if (attributes.ceo) {
            basicStats.portfolioCeoCount++
          }
          if (attributes.cfo || attendee.is_cfo) {
            basicStats.portfolioCfoCount++
          }
          if (attributes.coo) {
            basicStats.portfolioCooCount++
          }
          if (attributes.cto_cio) {
            basicStats.portfolioCioCtoCount++
          }
          if (attributes.cmo) {
            basicStats.portfolioCmoCount++
          }
        }
        
        // Count attendees by company analytics category (excluding Apax and Sponsors which are counted separately)
        if (analyticsCategory === 'Buyout Funds') {
          buyoutFundsMap.set(companyName, (buyoutFundsMap.get(companyName) || 0) + 1)
        } else if (analyticsCategory === 'Digital Funds') {
          digitalFundsMap.set(companyName, (digitalFundsMap.get(companyName) || 0) + 1)
        } else if (analyticsCategory === 'Impact Funds' || analyticsCategory === 'Other Funds') {
          impactAndOtherMap.set(companyName, (impactAndOtherMap.get(companyName) || 0) + 1)
        }
        
        // Count sponsor attendees (either by attribute OR by company category)
        if (attributes.sponsorAttendee || analyticsCategory === 'Sponsors & Vendors') {
          sponsorsMap.set(companyName, (sponsorsMap.get(companyName) || 0) + 1)
        }
        
        // Count spouses - check for meaningful spouse_details JSON content
        console.log('Checking attendee spouse details:', {
          id: attendee.id,
          has_spouse: attendee.has_spouse,
          spouse_details: attendee.spouse_details,
          spouse_details_type: typeof attendee.spouse_details,
          spouse_details_keys: attendee.spouse_details ? Object.keys(attendee.spouse_details) : 'null'
        })
        
        if (attendee.spouse_details && 
            typeof attendee.spouse_details === 'object' && 
            !Array.isArray(attendee.spouse_details) &&
            Object.keys(attendee.spouse_details).length > 0 &&
            (attendee.spouse_details.firstName || attendee.spouse_details.lastName)) {
          basicStats.totalSpouses++
          console.log('Counted spouse for attendee:', attendee.id)
        }
        
        // Count breakout session selections - safely handle array
        const breakouts = Array.isArray(attendee.selected_breakouts) ? attendee.selected_breakouts : []
        
        if (breakouts.includes('apax-software-ceo-summit')) {
          basicStats.softwareDay++
        }
        
        if (breakouts.includes('track-a-revenue-growth')) {
          basicStats.trackADigital++
        }
        
        if (breakouts.includes('track-b-operational-performance')) {
          basicStats.trackBCfoOps++
        }

        // Count dining selections - safely handle object structure
        const diningSelections = attendee.dining_selections
        
        // Ensure diningSelections is a valid object
        if (diningSelections && typeof diningSelections === 'object' && !Array.isArray(diningSelections)) {
          // Check all dining selections for this attendee
          Object.entries(diningSelections).forEach(([eventKey, selection]: [string, any]) => {
            // Safely check if selection is valid and has attending property
            if (selection && typeof selection === 'object' && selection.attending === true) {
              
              // Check for Welcome Dinner - match against actual JSON keys
              if (eventKey.includes('welcome-dinner') || 
                  eventKey.includes('welcome') && eventKey.includes('dinner') ||
                  (selection.eventName && selection.eventName.toLowerCase().includes('welcome') && selection.eventName.toLowerCase().includes('dinner'))) {
                basicStats.welcomeDinner++
              }
              
              // Check for Maple & Ash - match against actual JSON keys
              if (eventKey.includes('maple-ash') || 
                  eventKey.includes('maple') && eventKey.includes('ash') ||
                  (selection.eventName && selection.eventName.toLowerCase().includes('maple') && selection.eventName.toLowerCase().includes('ash'))) {
                basicStats.mapleAsh++
              }
            }
          })
        }
        
        // Count hotel selections
        const hotelSelection = attendee.hotel_selection
        if (hotelSelection) {
          if (fourSeasonsHotel && hotelSelection === fourSeasonsHotel.id) {
            basicStats.fourSeasonsCount++
          } else if (parkHyattHotel && hotelSelection === parkHyattHotel.id) {
            basicStats.parkHyattCount++
          } else if (hotelSelection === 'custom' || 
                     (hotelSelection !== fourSeasonsHotel?.id && hotelSelection !== parkHyattHotel?.id)) {
            // Any selection that's not Four Seasons or Park Hyatt is "Making Own Arrangements"
            basicStats.makingOwnArrangementsCount++
          }
        } else {
          // No hotel selection means making own arrangements
          basicStats.makingOwnArrangementsCount++
        }
      })

      // Set Apax companies count
      apaxAttendees.apaxCompaniesCount = apaxCompaniesSet.size

      // Convert company maps to sorted arrays with logos
      const createCompanyArray = (companyMap: Map<string, number>) => {
        return Array.from(companyMap.entries())
          .map(([companyName, count]) => ({
            companyName,
            logo: companyLogoMap.get(companyName.toLowerCase()),
            attendeeCount: count
          }))
          .sort((a, b) => b.attendeeCount - a.attendeeCount) // Sort by attendee count descending
      }

      // Load assigned seating events from agenda items
      const { data: agendaItems, error: agendaError } = await supabase
        .from('agenda_items')
        .select('id, title, date, start_time, location, capacity, seating_type')
        .eq('seating_type', 'assigned')
        .eq('is_active', true)

      if (agendaError) {
        throw new Error(`Failed to load agenda items: ${agendaError.message}`)
      }

      // Load assigned seating events from dining options
      const { data: assignedDiningOptions, error: assignedDiningError } = await supabase
        .from('dining_options')
        .select('id, name, date, time, location, capacity, seating_type')
        .eq('seating_type', 'assigned')
        .eq('is_active', true)

      if (assignedDiningError) {
        throw new Error(`Failed to load assigned dining options: ${assignedDiningError.message}`)
      }

      // Helper function to calculate agenda item registrations
      const calculateAgendaRegistrations = (agendaItemId: string, agendaTitle: string, stats: any): number => {
        // For specific breakout sessions, use the pre-calculated metrics
        if (agendaTitle.toLowerCase().includes('software') && agendaTitle.toLowerCase().includes('ceo')) {
          return stats.softwareDay
        }
        
        if (agendaTitle.toLowerCase().includes('track a') || 
            agendaTitle.toLowerCase().includes('revenue growth') ||
            agendaTitle.toLowerCase().includes('digital')) {
          return stats.trackADigital
        }
        
        if (agendaTitle.toLowerCase().includes('track b') || 
            agendaTitle.toLowerCase().includes('operational performance') ||
            agendaTitle.toLowerCase().includes('cfo')) {
          return stats.trackBCfoOps
        }
        
        // For Opening Remarks and general sessions, use total registrations minus spouses
        if (agendaTitle.toLowerCase().includes('opening') || 
            agendaTitle.toLowerCase().includes('welcome') ||
            agendaTitle.toLowerCase().includes('remarks') ||
            agendaTitle.toLowerCase().includes('keynote')) {
          return stats.totalRegistrations - stats.totalSpouses
        }
        
        // For other agenda items, count attendees excluding spouses
        return confirmedAttendees.filter(attendee => {
          // Exclude spouses using spouse_details JSON data
          if (attendee.spouse_details && 
              typeof attendee.spouse_details === 'object' && 
              !Array.isArray(attendee.spouse_details) &&
              Object.keys(attendee.spouse_details).length > 0 &&
              (attendee.spouse_details.firstName || attendee.spouse_details.lastName)) {
            return false
          }
          
          const breakouts = Array.isArray(attendee.selected_breakouts) ? attendee.selected_breakouts : []
          return breakouts.includes(agendaItemId)
        }).length
      }

      // Helper function to calculate dining option registrations
      const calculateDiningRegistrations = (diningOptionId: string, diningOptionName: string, stats: any): number => {
        // For Maple & Ash or Networking Dinner on Tuesday Evening, use pre-calculated metric
        if ((diningOptionName.toLowerCase().includes('maple') && diningOptionName.toLowerCase().includes('ash')) ||
            (diningOptionName.toLowerCase().includes('networking') && diningOptionName.toLowerCase().includes('dinner') && diningOptionName.toLowerCase().includes('tuesday'))) {
          return stats.mapleAsh
        }
        
        // For Welcome Dinner, use pre-calculated metric
        if (diningOptionName.toLowerCase().includes('welcome') && diningOptionName.toLowerCase().includes('dinner')) {
          return stats.welcomeDinner
        }
        
        // For other dining events, count attendees with dining selections (including spouses)
        let count = 0
        
        confirmedAttendees.forEach(attendee => {
          const diningSelections = attendee.dining_selections || {}
          
          // Safely check if diningSelections is an object
          if (diningSelections && typeof diningSelections === 'object' && !Array.isArray(diningSelections)) {
            // Check all dining selections for matches
            Object.entries(diningSelections).forEach(([eventKey, selection]: [string, any]) => {
              if (selection && typeof selection === 'object' && !Array.isArray(selection) && selection.attending === true) {
                // Match by dining option ID or name patterns
                if (eventKey === diningOptionId || 
                    eventKey.includes(diningOptionId) ||
                    (selection.eventName && selection.eventName.toLowerCase().includes(diningOptionName.toLowerCase()))) {
                  count++
                }
              }
            })
          }
        })
        
        return count
      }

      // Process assigned seating events
      const assignedSeatingEvents = [
        ...(agendaItems || []).map(item => ({
          id: item.id,
          name: item.title,
          type: 'agenda' as const,
          date: item.date,
          time: item.start_time,
          location: item.location,
          registeredCount: calculateAgendaRegistrations(item.id, item.title, basicStats),
          capacity: item.capacity
        })),
        ...(assignedDiningOptions || []).map(option => ({
          id: option.id,
          name: option.name,
          type: 'dining' as const,
          date: option.date,
          time: option.time,
          location: option.location,
          registeredCount: calculateDiningRegistrations(option.id, option.name, basicStats),
          capacity: option.capacity
        }))
      ]

      // Calculate hotel selections
      const hotelCounts = new Map<string, number>()
      const hotelNames = new Map<string, string>()
      
      // Map hotel IDs to names
      ;(hotels || []).forEach(hotel => {
        hotelNames.set(hotel.id, hotel.name)
        hotelCounts.set(hotel.id, 0)
      })

      // Count hotel selections
      confirmedAttendees.forEach(attendee => {
        const hotelSelection = attendee.hotel_selection
        if (hotelSelection && hotelCounts.has(hotelSelection)) {
          hotelCounts.set(hotelSelection, hotelCounts.get(hotelSelection)! + 1)
        }
      })

      // Convert to array format with percentages
      const hotelSelections = Array.from(hotelCounts.entries())
        .filter(([_, count]) => count > 0) // Only include hotels with selections
        .map(([hotelId, count]) => ({
          id: hotelId,
          name: hotelNames.get(hotelId) || 'Unknown Hotel',
          count,
          percentage: confirmedAttendees.length > 0 ? Math.round((count / confirmedAttendees.length) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count) // Sort by count descending

      // Combine all analytics data (remove hotelSelections as we now have specific counts)
      setAnalyticsData({
        ...basicStats,
        companiesWithNoAttendees,
        assignedSeatingEvents,
        attendeesByCompanyCategory: {
          apaxAttendees,
          buyoutFunds: createCompanyArray(buyoutFundsMap),
          digitalFunds: createCompanyArray(digitalFundsMap),
          impactAndOther: createCompanyArray(impactAndOtherMap),
          sponsors: createCompanyArray(sponsorsMap)
        }
      })
      
      // Debug log the categorized data
      console.log('Attendees by company category:', {
        apaxAttendees,
        buyoutFunds: createCompanyArray(buyoutFundsMap),
        digitalFunds: createCompanyArray(digitalFundsMap),
        impactAndOther: createCompanyArray(impactAndOtherMap),
        sponsors: createCompanyArray(sponsorsMap)
      })

    } catch (err) {
      console.error('Error loading event analytics data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEventAnalyticsData()
  }, [])

  return {
    analyticsData,
    loading,
    error,
    refreshAnalyticsData: loadEventAnalyticsData
  }
}

// Hook for sponsor report data
export function useSponsorReportData() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSponsorReportData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all standardized companies with their details
      const { data: companies, error: companiesError } = await supabase
        .from('standardized_companies')
        .select('id, name, logo, description, fund_analytics_category, sector, geography')
        .order('name', { ascending: true })

      if (companiesError) {
        throw new Error(`Failed to load companies: ${companiesError.message}`)
      }

      // Load all confirmed attendees with their details
      const { data: attendees, error: attendeesError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, title, photo, company, company_name_standardized, attributes, is_apax_ep, is_cfo, is_spouse')
        .eq('registration_status', 'confirmed')
        .order('first_name', { ascending: true })

      if (attendeesError) {
        throw new Error(`Failed to load attendees: ${attendeesError.message}`)
      }

      // Create company lookup map
      const companyMap = new Map()
      ;(companies || []).forEach(company => {
        companyMap.set(company.name.toLowerCase(), company)
      })

      // Group attendees by company and categorize
      const companyAttendeeMap = new Map()
      
      ;(attendees || []).forEach(attendee => {
        const companyName = attendee.company_name_standardized || attendee.company || 'Unknown Company'
        const company = companyMap.get(companyName.toLowerCase())
        
        if (!companyAttendeeMap.has(companyName)) {
          companyAttendeeMap.set(companyName, {
            company: company || { 
              name: companyName, 
              logo: null, 
              description: '', 
              fund_analytics_category: 'Other Funds' 
            },
            attendees: []
          })
        }
        
        companyAttendeeMap.get(companyName).attendees.push(attendee)
      })

      // Categorize companies with attendees
      const categorizedData = {
        apaxAttendees: {
          companies: [] as any[],
          attendees: {
            apaxIP: [] as any[],
            apaxEP: [] as any[],
            apaxOEP: [] as any[],
            apaxOther: [] as any[]
          }
        },
        buyoutFunds: [] as any[],
        digitalFunds: [] as any[],
        impactAndOther: [] as any[],
        sponsors: [] as any[]
      }

      // Process each company with attendees
      for (const [companyName, companyData] of companyAttendeeMap.entries()) {
        const { company, attendees: companyAttendees } = companyData
        
        // Skip companies with no attendees
        if (companyAttendees.length === 0) continue
        
        const category = company.fund_analytics_category || 'Other Funds'
        
        // Check if this company has any Apax attendees
        const hasApaxAttendees = companyAttendees.some(attendee => 
          attendee.attributes?.apaxIP || 
          attendee.attributes?.apaxEP ||
          attendee.attributes?.apaxOEP || 
          attendee.attributes?.apaxOther ||
          attendee.is_apax_ep
        )
        
        const companyEntry = {
          ...company,
          attendees: companyAttendees.sort((a, b) => 
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
          )
        }
        
        // Categorize individual Apax attendees for the special Apax section (regardless of company category)
        companyAttendees.forEach(attendee => {
          if (attendee.attributes?.apaxIP) {
            categorizedData.apaxAttendees.attendees.apaxIP.push(attendee)
          } else if (attendee.attributes?.apaxEP) {
            categorizedData.apaxAttendees.attendees.apaxEP.push(attendee)
          } else if (attendee.attributes?.apaxOEP) {
            categorizedData.apaxAttendees.attendees.apaxOEP.push(attendee)
          } else if (attendee.attributes?.apaxOther) {
            categorizedData.apaxAttendees.attendees.apaxOther.push(attendee)
          }
        })
        
        // Categorize companies based on their fund analytics category (excluding Apax personnel companies)
        if (category === 'Buyout Funds') {
          categorizedData.buyoutFunds.push(companyEntry)
        } else if (category === 'Digital Funds') {
          categorizedData.digitalFunds.push(companyEntry)
        } else if (category === 'Impact Funds' || category === 'Other Funds') {
          categorizedData.impactAndOther.push(companyEntry)
        } else if (category === 'Sponsors & Vendors') {
          categorizedData.sponsors.push(companyEntry)
        } else if (!hasApaxAttendees && category !== 'Apax Attendees') {
          // Default to Impact and Other for unknown categories
          categorizedData.impactAndOther.push(companyEntry)
        }
      }

      // Sort companies alphabetically within each category
      categorizedData.apaxAttendees.companies.sort((a, b) => a.name.localeCompare(b.name))
      categorizedData.buyoutFunds.sort((a, b) => a.name.localeCompare(b.name))
      categorizedData.digitalFunds.sort((a, b) => a.name.localeCompare(b.name))
      categorizedData.impactAndOther.sort((a, b) => a.name.localeCompare(b.name))
      categorizedData.sponsors.sort((a, b) => a.name.localeCompare(b.name))

      return categorizedData
    } catch (err) {
      console.error('Error loading sponsor report data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sponsor report data')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    getSponsorReportData
  }
}