import { supabase } from '../lib/supabase'

export interface CompanySeatingData {
  companyName: string
  seatingNotes: string
  priorityNetworkingAttendees: string[]
}

export interface PriorityNetworkingInfo {
  attendeeId: string
  companyName: string
  seatingNotes: string
  isPriorityNetworking: boolean
  priorityNetworkingAttendeeIds: string[]
}

/**
 * Get seating requests and priority networking data for companies
 */
export async function getCompanySeatingData(companyNames: string[]): Promise<Map<string, CompanySeatingData>> {
  try {
    const { data, error } = await supabase
      .from('standardized_companies')
      .select('name, seating_notes, priority_networking_attendees')
      .in('name', companyNames)

    if (error) {
      console.error('Error fetching company seating data:', error)
      return new Map()
    }

    const seatingDataMap = new Map<string, CompanySeatingData>()
    
    data?.forEach(company => {
      seatingDataMap.set(company.name, {
        companyName: company.name,
        seatingNotes: company.seating_notes || '',
        priorityNetworkingAttendees: company.priority_networking_attendees || []
      })
    })

    return seatingDataMap
  } catch (error) {
    console.error('Error in getCompanySeatingData:', error)
    return new Map()
  }
}

/**
 * Get priority networking information for a list of attendees
 */
export async function getPriorityNetworkingInfo(attendees: any[]): Promise<Map<string, PriorityNetworkingInfo>> {
  try {
    // Get unique company names from attendees
    const companyNames = [...new Set(
      attendees.map(attendee => 
        attendee.company_name_standardized || attendee.company
      ).filter(Boolean)
    )]

    const companySeatingData = await getCompanySeatingData(companyNames)
    const priorityInfoMap = new Map<string, PriorityNetworkingInfo>()

    attendees.forEach(attendee => {
      const companyName = attendee.company_name_standardized || attendee.company
      const companyData = companySeatingData.get(companyName)
      
      const isPriorityNetworking = companyData?.priorityNetworkingAttendees.includes(attendee.id) || false
      
      priorityInfoMap.set(attendee.id, {
        attendeeId: attendee.id,
        companyName: companyName,
        seatingNotes: companyData?.seatingNotes || '',
        isPriorityNetworking,
        priorityNetworkingAttendeeIds: companyData?.priorityNetworkingAttendees || []
      })
    })

    return priorityInfoMap
  } catch (error) {
    console.error('Error in getPriorityNetworkingInfo:', error)
    return new Map()
  }
}

/**
 * Get all companies with seating notes or priority networking requests
 */
export async function getCompaniesWithSeatingRequests(): Promise<CompanySeatingData[]> {
  try {
    const { data, error } = await supabase
      .from('standardized_companies')
      .select('name, seating_notes, priority_networking_attendees')
      .or('seating_notes.neq.,priority_networking_attendees.neq.{}')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching companies with seating requests:', error)
      return []
    }

    return (data || []).map(company => ({
      companyName: company.name,
      seatingNotes: company.seating_notes || '',
      priorityNetworkingAttendees: company.priority_networking_attendees || []
    }))
  } catch (error) {
    console.error('Error in getCompaniesWithSeatingRequests:', error)
    return []
  }
}

/**
 * Update company seating requests
 */
export async function updateCompanySeatingRequests(
  companyId: string,
  seatingNotes: string,
  priorityNetworkingAttendees: string[]
): Promise<boolean> {
  try {
    // Validate priority networking attendees limit
    if (priorityNetworkingAttendees.length > 5) {
      throw new Error('Maximum 5 priority networking attendees allowed')
    }

    const { error } = await supabase
      .from('standardized_companies')
      .update({
        seating_notes: seatingNotes,
        priority_networking_attendees: priorityNetworkingAttendees
      })
      .eq('id', companyId)

    if (error) {
      console.error('Error updating company seating requests:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateCompanySeatingRequests:', error)
    return false
  }
}