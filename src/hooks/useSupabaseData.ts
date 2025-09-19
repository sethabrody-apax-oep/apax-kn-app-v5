import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { standardizeAttendeeAttributes, standardizeFundAffiliation } from '../utils/fundAffiliationUtils'

type Attendee = Database['public']['Tables']['attendees']['Row']
type AttendeeInsert = Database['public']['Tables']['attendees']['Insert']
type AttendeeUpdate = Database['public']['Tables']['attendees']['Update']

type DiningOption = Database['public']['Tables']['dining_options']['Row']
type Hotel = Database['public']['Tables']['hotels']['Row']
type ImportHistory = Database['public']['Tables']['import_history']['Row']

// Mock data for fallback when no database data exists
const mockAttendees = [
  {
    id: '1',
    salutation: 'Mr',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@globalindustries.com',
    title: 'Chief Executive Officer',
    company: 'Global Industries Inc.',
    bio: 'John has over 20 years of experience in leading multinational corporations, specializing in strategic growth and digital transformation initiatives.',
    photo: '/Apax_Favicon_32x32-1 copy.png',
    business_phone: '+1 (555) 123-4567',
    mobile_phone: '+1 (555) 123-4567',
    check_in_date: '2025-03-15',
    check_out_date: '2025-03-17',
    hotel_selection: 'grand-hotel',
    custom_hotel: '',
    registration_id: '',
    has_spouse: false,
    spouse_details: {},
    dining_selections: {
      'welcome-dinner': { attending: true, tableNumber: 'Table 1' },
      'closing-reception': { attending: true },
      'executive-lunch': { attending: false }
    },
    selected_breakouts: ['digital-transformation', 'leadership-crisis'],
    registration_status: 'confirmed',
    access_code: '123456',
    attributes: {
      apaxIP: true,
      apaxOEP: false,
      portfolioCompanyExecutive: false,
      sponsorAttendee: false,
      speaker: true,
      spouse: false,
      ceo: true,
      cLevelExec: true,
      otherAttendeeType: false
    },
    dietary_requirements: '',
    address1: '',
    address2: '',
    postal_code: '',
    city: '',
    state: '',
    country: '',
    country_code: '',
    room_type: '',
    assistant_name: '',
    assistant_email: '',
    idloom_id: '',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// Custom hook for attendees using Supabase
export function useAttendees() {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAttendees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('attendees') // Select from attendees table
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setAttendees([])
      } else {
        console.log('Loaded attendees from Supabase:', data?.length || 0)
        
        // Debug logging for dietary requirements
        const attendeesWithDietary = (data || []).filter(a => a.dietary_requirements && a.dietary_requirements.trim())
        console.log('DEBUG: Attendees with dietary requirements:', attendeesWithDietary.length)
        
        if (attendeesWithDietary.length > 0) {
          console.log('DEBUG: Sample attendees with dietary requirements:', 
            attendeesWithDietary.slice(0, 3).map(a => ({
              id: a.id,
              first_name: a.first_name,
              last_name: a.last_name,
              dietary_requirements: a.dietary_requirements,
              dietary_requirements_type: typeof a.dietary_requirements,
              dietary_requirements_length: a.dietary_requirements?.length
            }))
          )
        }
        
        // Fetch company data separately to get fund_analytics_category
        const companyNames = [...new Set((data || []).map(attendee => attendee.company_name_standardized).filter(Boolean))]
        let companiesData = []
        
        if (companyNames.length > 0) {
          const { data: companies, error: companiesError } = await supabase
            .from('standardized_companies')
            .select('name, fund_analytics_category')
            .in('name', companyNames)
          
          if (companiesError) {
            console.error('Error loading companies:', companiesError)
          } else {
            companiesData = companies || []
          }
        }

        // Create a map for quick lookup
        const companyMap = new Map(companiesData.map(company => [company.name, company.fund_analytics_category]))

        // Transform the data to match frontend expectations, adding company fund category
        const transformedAttendees = (data || []).map(attendee => {
          const companyFundCategory = attendee.company_name_standardized 
            ? companyMap.get(attendee.company_name_standardized) 
            : null
          
          return transformAttendeeData({
            ...attendee,
            standardized_companies: companyFundCategory ? { fund_analytics_category: companyFundCategory } : null
          })
        })
        
        setAttendees(transformedAttendees)
      }
    } catch (err) {
      console.error('Error loading attendees:', err)
      setError('Connection failed')
      setAttendees([])
    } finally {
      setLoading(false)
    }
  }

  const createAttendee = async (attendeeData: Omit<AttendeeInsert, 'id'>) => {
    try {
      // Standardize attributes before saving
      const standardizedAttributes = standardizeAttendeeAttributes(attendeeData.attributes || {})
      
      // Convert the form data to match Supabase schema
      const supabaseData: AttendeeInsert = {
        salutation: attendeeData.salutation || '',
        first_name: attendeeData.firstName || attendeeData.first_name,
        last_name: attendeeData.lastName || attendeeData.last_name,
        email: attendeeData.email,
        title: attendeeData.title,
        company: attendeeData.company,
        bio: attendeeData.bio || '',
        photo: attendeeData.photo || '/Apax_Favicon_32x32-1 copy.png',
        business_phone: attendeeData.businessPhone || attendeeData.business_phone || '',
        mobile_phone: attendeeData.mobilePhone || attendeeData.mobile_phone || '',
        check_in_date: attendeeData.checkInDate || attendeeData.check_in_date || '2025-03-15',
        check_out_date: attendeeData.checkOutDate || attendeeData.check_out_date || '2025-03-17',
        hotel_selection: attendeeData.hotelSelection || attendeeData.hotel_selection || 'grand-hotel',
        custom_hotel: attendeeData.customHotel || attendeeData.custom_hotel || '',
        registration_id: attendeeData.registrationId || attendeeData.registration_id || '',
        has_spouse: attendeeData.hasSpouse || attendeeData.has_spouse || false,
        spouse_details: attendeeData.spouseDetails || attendeeData.spouse_details || {},
        dining_selections: attendeeData.diningSelections || attendeeData.dining_selections || {},
        selected_breakouts: attendeeData.selectedBreakouts || attendeeData.selected_breakouts || [],
        registration_status: attendeeData.registrationStatus || attendeeData.registration_status || 'confirmed',
        access_code: attendeeData.accessCode || Math.random().toString().slice(2, 8),
        attributes: standardizedAttributes,
        dietary_requirements: attendeeData.dietaryRequirements || attendeeData.dietary_requirements || '',
        address1: attendeeData.address1 || '',
        address2: attendeeData.address2 || '',
        postal_code: attendeeData.postalCode || attendeeData.postal_code || '',
        city: attendeeData.city || '',
        state: attendeeData.state || '',
        country: attendeeData.country || '',
        country_code: attendeeData.countryCode || attendeeData.country_code || '',
        room_type: attendeeData.roomType || attendeeData.room_type || '',
        assistant_name: attendeeData.assistantName || attendeeData.assistant_name || '',
        assistant_email: attendeeData.assistantEmail || attendeeData.assistant_email || '',
        idloom_id: attendeeData.idloomId || attendeeData.idloom_id || '',
        is_cfo: attendeeData.attributes?.cfo || attendeeData.is_cfo || false,
        is_apax_ep: attendeeData.attributes?.apaxEP || attendeeData.is_apax_ep || false,
        is_spouse: attendeeData.isSpouse || attendeeData.is_spouse || false,
        primary_attendee_id: attendeeData.primaryAttendeeId || attendeeData.primary_attendee_id || null
      }

      const { data, error: supabaseError } = await supabase
        .from('attendees')
        .insert([supabaseData])
        .select()
        .single()

      if (supabaseError) {
        console.error('Supabase insert error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      console.log('Successfully created attendee:', data)
      await loadAttendees() // Refresh the list
      return data
    } catch (err) {
      console.error('Create attendee error:', err)
      setError('Failed to create attendee')
      throw err
    }
  }

  const updateAttendee = async (id: string, updates: AttendeeUpdate) => {
    try {
      // Standardize attributes before saving
      const standardizedAttributes = standardizeAttendeeAttributes(updates.attributes || {})
      
      // Convert the form data to match Supabase schema
      const supabaseUpdates: AttendeeUpdate = {
        salutation: updates.salutation,
        first_name: updates.firstName || updates.first_name,
        last_name: updates.lastName || updates.last_name,
        email: updates.email,
        title: updates.title,
        company: updates.company,
        bio: updates.bio,
        photo: updates.photo,
        business_phone: updates.businessPhone || updates.business_phone,
        mobile_phone: updates.mobilePhone || updates.mobile_phone,
        check_in_date: updates.checkInDate || updates.check_in_date,
        check_out_date: updates.checkOutDate || updates.check_out_date,
        hotel_selection: updates.hotelSelection || updates.hotel_selection,
        custom_hotel: updates.customHotel || updates.custom_hotel,
        registration_id: updates.registrationId || updates.registration_id,
        has_spouse: updates.hasSpouse || updates.has_spouse,
        spouse_details: updates.spouseDetails || updates.spouse_details,
        dining_selections: updates.diningSelections || updates.dining_selections,
        selected_breakouts: updates.selectedBreakouts || updates.selected_breakouts,
        registration_status: updates.registrationStatus || updates.registration_status,
        access_code: updates.accessCode || updates.access_code,
        attributes: standardizedAttributes,
        dietary_requirements: updates.dietaryRequirements || updates.dietary_requirements,
        address1: updates.address1,
        address2: updates.address2,
        postal_code: updates.postalCode || updates.postal_code,
        city: updates.city,
        state: updates.state,
        country: updates.country,
        country_code: updates.countryCode || updates.country_code,
        room_type: updates.roomType || updates.room_type,
        assistant_name: updates.assistantName || updates.assistant_name,
        assistant_email: updates.assistantEmail || updates.assistant_email,
        idloom_id: updates.idloomId || updates.idloom_id,
        is_cfo: updates.attributes?.cfo || updates.is_cfo || false,
        is_apax_ep: updates.attributes?.apaxEP || updates.is_apax_ep || false,
        is_spouse: updates.isSpouse || updates.is_spouse || false,
        primary_attendee_id: updates.primaryAttendeeId || updates.primary_attendee_id || null,
        updated_at: new Date().toISOString()
      }

      const { error: supabaseError } = await supabase
        .from('attendees')
        .update(supabaseUpdates)
        .eq('id', id)

      if (supabaseError) {
        console.error('Supabase update error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      console.log('Successfully updated attendee:', id)
      await loadAttendees() // Refresh the list
    } catch (err) {
      console.error('Update attendee error:', err)
      setError('Failed to update attendee')
      throw err
    }
  }

  const deleteAttendee = async (id: string) => {
    try {
      console.log('Attempting to delete attendee:', id)
      
      const { error: supabaseError } = await supabase
        .from('attendees')
        .delete()
        .eq('id', id)

      if (supabaseError) {
        console.error('Supabase delete error:', supabaseError)
        // Don't throw error for permission issues, just log and show user-friendly message
        if (supabaseError.code === '42501' || supabaseError.message.includes('permission')) {
          alert('Permission denied: Unable to delete attendee. Please check your admin permissions.')
          return
        }
        alert(`Failed to delete attendee: ${supabaseError.message}`)
        return
      }

      console.log('Successfully deleted attendee:', id)
      await loadAttendees() // Refresh the list
    } catch (err) {
      console.error('Delete attendee error:', err)
      // Don't throw errors that could cause logout
      alert('Failed to delete attendee. Please try again.')
    }
  }

  const bulkCreateAttendees = async (attendeesData: Omit<AttendeeInsert, 'id'>[]) => {
    try {
      // Convert all attendee data to match Supabase schema
      const supabaseData = attendeesData.map(attendeeData => {
        // Standardize attributes before saving
        const standardizedAttributes = standardizeAttendeeAttributes(attendeeData.attributes || {})
        
        return {
          // Include id if provided for upsert operations
          ...(attendeeData.id && { id: attendeeData.id }),
          salutation: attendeeData.salutation || '',
          first_name: attendeeData.firstName || attendeeData.first_name,
          last_name: attendeeData.lastName || attendeeData.last_name,
          email: attendeeData.email || null, // Allow null emails for spouses
          title: attendeeData.title,
          company: attendeeData.company,
          bio: attendeeData.bio || '',
          photo: attendeeData.photo || '/Apax_Favicon_32x32-1 copy.png',
          business_phone: attendeeData.businessPhone || attendeeData.business_phone || '',
          mobile_phone: attendeeData.mobilePhone || attendeeData.mobile_phone || '',
          check_in_date: attendeeData.checkInDate || attendeeData.check_in_date || '2025-03-15',
          check_out_date: attendeeData.checkOutDate || attendeeData.check_out_date || '2025-03-17',
          hotel_selection: attendeeData.hotelSelection || attendeeData.hotel_selection || 'grand-hotel',
          custom_hotel: attendeeData.customHotel || attendeeData.custom_hotel || '',
          registration_id: attendeeData.registrationId || attendeeData.registration_id || '',
          has_spouse: attendeeData.hasSpouse || attendeeData.has_spouse || false,
          spouse_details: attendeeData.spouseDetails || attendeeData.spouse_details || {},
          dining_selections: attendeeData.diningSelections || attendeeData.dining_selections || {},
          selected_breakouts: attendeeData.selectedBreakouts || attendeeData.selected_breakouts || [],
          registration_status: attendeeData.registrationStatus || attendeeData.registration_status || 'confirmed',
          access_code: attendeeData.accessCode || Math.random().toString().slice(2, 8),
          attributes: standardizedAttributes,
          dietary_requirements: attendeeData.dietaryRequirements || attendeeData.dietary_requirements || '',
          address1: attendeeData.address1 || '',
          address2: attendeeData.address2 || '',
          postal_code: attendeeData.postalCode || attendeeData.postal_code || '',
          city: attendeeData.city || '',
          state: attendeeData.state || '',
          country: attendeeData.country || '',
          country_code: attendeeData.countryCode || attendeeData.country_code || '',
          room_type: attendeeData.roomType || attendeeData.room_type || '',
          assistant_name: attendeeData.assistantName || attendeeData.assistant_name || '',
          assistant_email: attendeeData.assistantEmail || attendeeData.assistant_email || '',
          idloom_id: attendeeData.idloomId || attendeeData.idloom_id || '',
          is_cfo: attendeeData.attributes?.cfo || false,
          is_apax_ep: attendeeData.attributes?.apaxEP || false,
          is_spouse: attendeeData.isSpouse || attendeeData.is_spouse || false,
          primary_attendee_id: attendeeData.primaryAttendeeId || attendeeData.primary_attendee_id || null
        }
      })

      // Use upsert to handle both inserts and updates
      const { data, error: supabaseError } = await supabase
        .from('attendees')
        .upsert(supabaseData, { 
          onConflict: 'id'
        })
        .select()

      if (supabaseError) {
        console.error('Supabase bulk insert error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      console.log('Successfully bulk upserted attendees:', supabaseData.length)
      await loadAttendees() // Refresh the list
      return data
    } catch (err) {
      console.error('Bulk upsert attendees error:', err)
      setError('Failed to bulk upsert attendees')
      throw err
    }
  }

  useEffect(() => {
    loadAttendees()
  }, [])

  return {
    attendees,
    loading,
    error,
    createAttendee,
    updateAttendee,
    deleteAttendee,
    bulkCreateAttendees,
    refreshAttendees: loadAttendees
  }
}

// Transform Supabase data to frontend format
export function transformAttendeeData(supabaseAttendee: any) {
  // Debug logging for dietary requirements
  console.log('DEBUG: transformAttendeeData - Raw dietary_requirements:', {
    attendeeId: supabaseAttendee.id,
    firstName: supabaseAttendee.first_name,
    lastName: supabaseAttendee.last_name,
    dietary_requirements: supabaseAttendee.dietary_requirements,
    dietary_requirements_type: typeof supabaseAttendee.dietary_requirements,
    dietary_requirements_length: supabaseAttendee.dietary_requirements?.length
  })

  return {
    id: supabaseAttendee.id,
    salutation: supabaseAttendee.salutation || '',
    firstName: supabaseAttendee.first_name || '',
    lastName: supabaseAttendee.last_name || '',
    email: supabaseAttendee.email || '',
    title: supabaseAttendee.title || '',
    company: supabaseAttendee.company || '',
    company_name_standardized: supabaseAttendee.company_name_standardized || supabaseAttendee.company || '',
    bio: supabaseAttendee.bio || '',
    photo: supabaseAttendee.photo || '/Apax_Favicon_32x32-1 copy.png',
    businessPhone: supabaseAttendee.business_phone || '',
    mobilePhone: supabaseAttendee.mobile_phone || '',
    dietaryRequirements: supabaseAttendee.dietary_requirements || '',
    assistantName: supabaseAttendee.assistant_name || '',
    assistantEmail: supabaseAttendee.assistant_email || '',
    checkInDate: supabaseAttendee.check_in_date || '',
    checkOutDate: supabaseAttendee.check_out_date || '',
    hotelSelection: supabaseAttendee.hotel_selection || '',
    customHotel: supabaseAttendee.custom_hotel || '',
    registrationId: supabaseAttendee.registration_id || '',
    hasSpouse: supabaseAttendee.has_spouse || false,
    spouseDetails: supabaseAttendee.spouse_details || {},
    diningSelections: supabaseAttendee.dining_selections || {},
    selectedBreakouts: supabaseAttendee.selected_breakouts || [],
    registrationStatus: supabaseAttendee.registration_status || 'pending',
    accessCode: supabaseAttendee.access_code || '',
    attributes: {
      apaxIP: supabaseAttendee.attributes?.apaxIP || false,
      apaxOEP: supabaseAttendee.attributes?.apaxOEP || false,
      apaxOther: supabaseAttendee.attributes?.apaxOther || false,
      portfolioCompanyExecutive: supabaseAttendee.attributes?.portfolioCompanyExecutive || false,
      sponsorAttendee: supabaseAttendee.attributes?.sponsorAttendee || false,
      speaker: supabaseAttendee.attributes?.speaker || false,
      otherAttendeeType: supabaseAttendee.attributes?.otherAttendeeType || false,
      ceo: supabaseAttendee.attributes?.ceo || false,
      cfo: supabaseAttendee.is_cfo || false,
      cmo: supabaseAttendee.attributes?.cmo || false,
      cro: supabaseAttendee.attributes?.cro || false,
      coo: supabaseAttendee.attributes?.coo || false,
      chro: supabaseAttendee.attributes?.chro || false,
      cto_cio: supabaseAttendee.attributes?.cto_cio || false,
      cLevelExec: supabaseAttendee.attributes?.cLevelExec || false,
      nonCLevelExec: supabaseAttendee.attributes?.nonCLevelExec || false,
      apaxEP: supabaseAttendee.attributes?.apaxEP || false, // Use attributes field, not direct column
      fundAffiliation: (() => {
        const category = supabaseAttendee.standardized_companies?.fund_analytics_category
        // Only apply fund affiliation standardization to actual fund categories
        if (category && ['Buyout Funds', 'Digital Funds', 'Impact Funds', 'Other Funds'].includes(category)) {
          return standardizeFundAffiliation(category) || ''
        }
        // For non-fund categories (Sponsors & Vendors, Apax Attendees), return empty string
        return ''
      })()
    },
    address1: supabaseAttendee.address1 || '',
    address2: supabaseAttendee.address2 || '',
    postalCode: supabaseAttendee.postal_code || '',
    city: supabaseAttendee.city || '',
    state: supabaseAttendee.state || '',
    country: supabaseAttendee.country || '',
    countryCode: supabaseAttendee.country_code || '',
    roomType: supabaseAttendee.room_type || '',
    idloomId: supabaseAttendee.idloom_id || '',
    isSpouse: supabaseAttendee.is_spouse || false,
    primaryAttendeeId: supabaseAttendee.primary_attendee_id || null,
    dietaryRequirements: supabaseAttendee.dietary_requirements || '',
    createdAt: supabaseAttendee.created_at,
    updatedAt: supabaseAttendee.updated_at
  }
  
  // Debug logging after transformation
  const transformedData = {
    // ... all the existing return object properties
  }
  
  console.log('DEBUG: transformAttendeeData - After transformation:', {
    attendeeId: transformedData.id,
    dietaryRequirements: transformedData.dietaryRequirements,
    dietaryRequirements_type: typeof transformedData.dietaryRequirements
  })
  
  return transformedData
}

// Custom hook for dining options using Supabase
export function useDiningOptions() {
  const [diningOptions, setDiningOptions] = useState<DiningOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const initialDiningOptions = [
    {
      id: '1',
      name: 'Welcome Dinner',
      date: '2025-03-15',
      time: '19:00:00',
      location: 'Grand Ballroom',
      address: '123 Business District, Downtown, NY 10001',
      address_validated: true,
      has_table_assignments: true,
      tables: [
        { name: 'Table 1', capacity: 8 },
        { name: 'Table 2', capacity: 8 },
        { name: 'Table 3', capacity: 6 },
        { name: 'Table 4', capacity: 8 },
        { name: 'Table 5', capacity: 10 },
        { name: 'Not Applicable', capacity: 0 }
      ],
      is_active: true,
      display_order: 1,
      seating_type: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Closing Reception',
      date: '2025-03-17',
      time: '18:00:00',
      location: 'Rooftop Terrace',
      address: '456 Corporate Ave, Business District, NY 10002',
      address_validated: true,
      has_table_assignments: false,
      tables: [{ name: 'Not Applicable', capacity: 0 }],
      is_active: true,
      display_order: 2,
      seating_type: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Executive Lunch',
      date: '2025-03-16',
      time: '12:30:00',
      location: 'Executive Dining Room',
      address: '789 Executive Blvd, Downtown, NY 10003',
      address_validated: true,
      has_table_assignments: true,
      tables: [
        { name: 'Table A', capacity: 6 },
        { name: 'Table B', capacity: 6 },
        { name: 'Table C', capacity: 8 },
        { name: 'Not Applicable', capacity: 0 }
      ],
      is_active: true,
      display_order: 3,
      seating_type: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]

  const loadDiningOptions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('dining_options')
        .select('*')
        .order('display_order', { ascending: true })

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setDiningOptions(initialDiningOptions) // Use initial data as fallback
      } else {
        console.log('Loaded dining options from Supabase:', data?.length || 0)
        setDiningOptions(data || [])
      }
    } catch (err) {
      console.error('Error loading dining options:', err)
      setError('Connection failed')
      setDiningOptions(initialDiningOptions) // Use initial data as fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDiningOptions()
  }, [])

  return {
    diningOptions,
    loading,
    error,
    refreshDiningOptions: loadDiningOptions
  }
}

// Custom hook for hotels using Supabase
export function useHotels() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const loadHotels = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('hotels')
        .select('*')
        .order('display_order', { ascending: true })

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setHotels([])
      } else {
        console.log('Loaded hotels from Supabase:', data?.length || 0)
        setHotels(data || [])
      }
    } catch (err) {
      console.error('Error loading hotels:', err)
      setError('Connection failed')
      setHotels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHotels()
  }, [])

  return {
    hotels,
    loading,
    error,
    refreshHotels: loadHotels
  }
}

// Custom hook for breakout sessions using Supabase agenda_items
export function useBreakoutSessions() {
  const [breakoutSessions, setBreakoutSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBreakoutSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('type', 'breakout')
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (supabaseError) {
        console.error('Supabase error loading breakout sessions:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setBreakoutSessions([])
      } else {
        console.log('Loaded breakout sessions from Supabase:', data?.length || 0)
        setBreakoutSessions(data || [])
      }
    } catch (err) {
      console.error('Error loading breakout sessions:', err)
      setError('Connection failed')
      setBreakoutSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBreakoutSessions()
  }, [])

  return {
    breakoutSessions,
    loading,
    error,
    refreshBreakoutSessions: loadBreakoutSessions
  }
}

// Custom hook for agenda items using Supabase
export function useAgendaItems() {
  const [agendaItems, setAgendaItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAgendaItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('agenda_items')
        .select(`
          *,
          agenda_item_speakers(
            id,
            speaker_order,
            attendees(
              id,
              first_name,
              last_name,
              title,
              company,
              email,
              photo
            )
          )
        `)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (supabaseError) {
        console.error('Supabase error loading agenda items:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setAgendaItems([])
      } else {
        console.log('Loaded agenda items from Supabase:', data?.length || 0)
        // Transform the data to include speakers array
        const transformedData = (data || []).map(item => ({
          ...item,
          speakers: (item.agenda_item_speakers || [])
            .sort((a, b) => (a.speaker_order || 1) - (b.speaker_order || 1))
            .map(speaker => ({
              id: speaker.attendees.id,
              first_name: speaker.attendees.first_name,
              last_name: speaker.attendees.last_name,
              title: speaker.attendees.title,
              company: speaker.attendees.company,
              email: speaker.attendees.email,
              photo: speaker.attendees.photo,
              speaker_order: speaker.speaker_order
            }))
        }))
        setAgendaItems(transformedData)
      }
    } catch (err) {
      console.error('Error loading agenda items:', err)
      setError('Connection failed')
      setAgendaItems([])
    } finally {
      setLoading(false)
    }
  }

  const createAgendaItem = async (agendaData: any, speakerIds: string[] = []) => {
    try {
      // Create the agenda item first
      const { data: newItem, error: itemError } = await supabase
        .from('agenda_items')
        .insert([agendaData])
        .select()
        .single()

      if (itemError) throw itemError

      // Add speaker assignments if any
      if (speakerIds.length > 0) {
        const speakerAssignments = speakerIds.map((attendeeId, index) => ({
          agenda_item_id: newItem.id,
          attendee_id: attendeeId,
          speaker_order: index + 1
        }))

        const { error: speakerError } = await supabase
          .from('agenda_item_speakers')
          .insert(speakerAssignments)

        if (speakerError) throw speakerError
      }

      await loadAgendaItems()
      return newItem
    } catch (error) {
      console.error('Error creating agenda item:', error)
      throw error
    }
  }

  const updateAgendaItem = async (id: string, agendaData: any, speakerIds: string[] = []) => {
    try {
      // Update the agenda item
      const { error: itemError } = await supabase
        .from('agenda_items')
        .update(agendaData)
        .eq('id', id)

      if (itemError) throw itemError

      // Delete existing speaker assignments
      const { error: deleteError } = await supabase
        .from('agenda_item_speakers')
        .delete()
        .eq('agenda_item_id', id)

      if (deleteError) throw deleteError

      // Add new speaker assignments if any
      if (speakerIds.length > 0) {
        const speakerAssignments = speakerIds.map((attendeeId, index) => ({
          agenda_item_id: id,
          attendee_id: attendeeId,
          speaker_order: index + 1
        }))

        const { error: speakerError } = await supabase
          .from('agenda_item_speakers')
          .insert(speakerAssignments)

        if (speakerError) throw speakerError
      }

      await loadAgendaItems()
    } catch (error) {
      console.error('Error updating agenda item:', error)
      throw error
    }
  }

  const deleteAgendaItem = async (id: string) => {
    try {
      // Delete the agenda item (speaker assignments will cascade delete)
      const { error } = await supabase
        .from('agenda_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadAgendaItems()
    } catch (error) {
      console.error('Error deleting agenda item:', error)
      throw error
    }
  }
  useEffect(() => {
    loadAgendaItems()
  }, [])

  return {
    agendaItems,
    loading,
    error,
    createAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    refreshAgendaItems: loadAgendaItems
  }
}

// Custom hook for sponsors using Supabase
export function useSponsors() {
  const [sponsors, setSponsors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSponsors = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('sponsors')
        .select('*')
        .order('display_order', { ascending: true })

      if (supabaseError) {
        console.error('Supabase error loading sponsors:', supabaseError)
        setError(`Database error: ${supabaseError.message}`)
        setSponsors([])
      } else {
        console.log('Loaded sponsors from Supabase:', data?.length || 0)
        setSponsors(data || [])
      }
    } catch (err) {
      console.error('Error loading sponsors:', err)
      setError('Connection failed')
      setSponsors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSponsors()
  }, [])

  return {
    sponsors,
    loading,
    error,
    refreshSponsors: loadSponsors
  }
}