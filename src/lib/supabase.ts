import { createClient } from '@supabase/supabase-js'
import { standardizeFundAffiliation, needsStandardization } from '../utils/fundAffiliationUtils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Authentication helper functions
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const getCurrentUserProfile = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (error) throw error
    return { user, profile }
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error signing out:', error)
    return false
  }
}

// Fund Affiliation Migration Functions
export const migrateFundAffiliationData = async () => {
  try {
    console.log('Starting fund affiliation data migration...')
    
    // Get all attendees with fund affiliation attributes
    const { data: attendees, error: fetchError } = await supabase
      .from('attendees')
      .select('id, attributes')
      .not('attributes', 'is', null)

    if (fetchError) {
      throw new Error(`Failed to fetch attendees: ${fetchError.message}`)
    }

    if (!attendees || attendees.length === 0) {
      console.log('No attendees found with attributes')
      return { updated: 0, errors: 0, message: 'No attendees found with attributes' }
    }

    console.log(`Found ${attendees.length} attendees with attributes`)

    let updated = 0
    let errors = 0
    const updatePromises = []

    for (const attendee of attendees) {
      try {
        const attributes = attendee.attributes || {}
        const currentFundAffiliation = attributes.fundAffiliation
        
        if (currentFundAffiliation && needsStandardization(currentFundAffiliation)) {
          const standardized = standardizeFundAffiliation(currentFundAffiliation)
          
          if (standardized && standardized !== currentFundAffiliation) {
            console.log(`Updating attendee ${attendee.id}: "${currentFundAffiliation}" -> "${standardized}"`)
            
            const updatedAttributes = {
              ...attributes,
              fundAffiliation: standardized
            }

            const updatePromise = supabase
              .from('attendees')
              .update({ attributes: updatedAttributes })
              .eq('id', attendee.id)
              .then(({ error }) => {
                if (error) {
                  console.error(`Error updating attendee ${attendee.id}:`, error)
                  errors++
                } else {
                  updated++
                }
              })

            updatePromises.push(updatePromise)
          }
        }
      } catch (error) {
        console.error(`Error processing attendee ${attendee.id}:`, error)
        errors++
      }
    }

    // Execute all updates
    await Promise.all(updatePromises)

    const message = `Migration completed: ${updated} records updated, ${errors} errors`
    console.log(message)
    
    return { updated, errors, message }
  } catch (error) {
    console.error('Fund affiliation migration error:', error)
    throw error
  }
}

// Check migration status
export const checkFundAffiliationMigrationStatus = async () => {
  try {
    const { data: attendees, error } = await supabase
      .from('attendees')
      .select('id, attributes')
      .not('attributes', 'is', null)

    if (error) throw error

    let needsMigration = 0
    let alreadyStandardized = 0

    for (const attendee of attendees || []) {
      const fundAffiliation = attendee.attributes?.fundAffiliation
      if (fundAffiliation) {
        if (needsStandardization(fundAffiliation)) {
          needsMigration++
        } else {
          alreadyStandardized++
        }
      }
    }

    return {
      total: (attendees || []).length,
      needsMigration,
      alreadyStandardized,
      requiresMigration: needsMigration > 0
    }
  } catch (error) {
    console.error('Error checking migration status:', error)
    throw error
  }
}

// Database types
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          role: 'super_admin' | 'admin' | 'viewer'
          email: string
          first_name: string
          last_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'super_admin' | 'admin' | 'viewer'
          email: string
          first_name?: string
          last_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'super_admin' | 'admin' | 'viewer'
          email?: string
          first_name?: string
          last_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      attendees: {
        Row: {
          id: string
          salutation: string | null
          first_name: string
          last_name: string
          email: string
          title: string
          company: string
          bio: string | null
          photo: string | null
          business_phone: string | null
          mobile_phone: string | null
          check_in_date: string | null
          check_out_date: string | null
          hotel_selection: string | null
          custom_hotel: string | null
          registration_id: string | null
          has_spouse: boolean | null
          spouse_details: any | null
          dining_selections: any | null
          selected_breakouts: string[] | null
          registration_status: string | null
          access_code: string
          attributes: {
            apaxIP?: boolean
            apaxOEP?: boolean
            apaxOther?: boolean
            portfolioCompanyExecutive?: boolean
            sponsorAttendee?: boolean
            speaker?: boolean
            otherAttendeeType?: boolean
            ceo?: boolean
            cfo?: boolean
            cmo?: boolean
            cro?: boolean
            coo?: boolean
            chro?: boolean
            cto_cio?: boolean
            cLevelExec?: boolean
            nonCLevelExec?: boolean
            fundAffiliation?: string
          } | null
          dietary_requirements: string | null
          address1: string | null
          address2: string | null
          postal_code: string | null
          city: string | null
          state: string | null
          country: string | null
          country_code: string | null
          room_type: string | null
          assistant_name: string | null
          assistant_email: string | null
          idloom_id: string | null
          last_synced_at: string | null
          created_at: string | null
          updated_at: string | null
          is_cfo: boolean | null
          is_apax_ep: boolean | null
          is_spouse: boolean | null
          primary_attendee_id: string | null
        }
        Insert: {
          id?: string
          salutation?: string | null
          first_name: string
          last_name: string
          email: string
          title: string
          company: string
          bio?: string | null
          photo?: string | null
          business_phone?: string | null
          mobile_phone?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          hotel_selection?: string | null
          custom_hotel?: string | null
          registration_id?: string | null
          has_spouse?: boolean | null
          spouse_details?: any | null
          dining_selections?: any | null
          selected_breakouts?: string[] | null
          registration_status?: string | null
          access_code: string
          attributes?: {
            apaxIP?: boolean
            apaxOEP?: boolean
            apaxOther?: boolean
            portfolioCompanyExecutive?: boolean
            sponsorAttendee?: boolean
            speaker?: boolean
            otherAttendeeType?: boolean
            ceo?: boolean
            cfo?: boolean
            cmo?: boolean
            cro?: boolean
            coo?: boolean
            chro?: boolean
            cto_cio?: boolean
            cLevelExec?: boolean
            nonCLevelExec?: boolean
            fundAffiliation?: string
          } | null
          dietary_requirements?: string | null
          address1?: string | null
          address2?: string | null
          postal_code?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          country_code?: string | null
          room_type?: string | null
          assistant_name?: string | null
          assistant_email?: string | null
          idloom_id?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_cfo?: boolean | null
          is_apax_ep?: boolean | null
          is_spouse?: boolean | null
          primary_attendee_id?: string | null
        }
        Update: {
          id?: string
          salutation?: string | null
          first_name?: string
          last_name?: string
          email?: string
          title?: string
          company?: string
          bio?: string | null
          photo?: string | null
          business_phone?: string | null
          mobile_phone?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          hotel_selection?: string | null
          custom_hotel?: string | null
          registration_id?: string | null
          has_spouse?: boolean | null
          spouse_details?: any | null
          dining_selections?: any | null
          selected_breakouts?: string[] | null
          registration_status?: string | null
          access_code?: string
          attributes?: {
            apaxIP?: boolean
            apaxOEP?: boolean
            apaxOther?: boolean
            portfolioCompanyExecutive?: boolean
            sponsorAttendee?: boolean
            speaker?: boolean
            otherAttendeeType?: boolean
            ceo?: boolean
            cfo?: boolean
            cmo?: boolean
            cro?: boolean
            coo?: boolean
            chro?: boolean
            cto_cio?: boolean
            cLevelExec?: boolean
            nonCLevelExec?: boolean
            fundAffiliation?: string
          } | null
          dietary_requirements?: string | null
          address1?: string | null
          address2?: string | null
          postal_code?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          country_code?: string | null
          room_type?: string | null
          assistant_name?: string | null
          assistant_email?: string | null
          idloom_id?: string | null
          last_synced_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          is_cfo?: boolean | null
          is_apax_ep?: boolean | null
          is_spouse?: boolean | null
          primary_attendee_id?: string | null
        }
      }
      agenda_items: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string
          start_time: string
          end_time: string
          location: string
          type: string
          speaker: any | null
          capacity: number | null
          registered_count: number | null
          attendee_selection: string | null
          selected_attendees: string[] | null
          is_active: boolean | null
          seating_type: string | null
          seating_notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date: string
          start_time: string
          end_time: string
          location: string
          type: string
          speaker?: any | null
          capacity?: number | null
          registered_count?: number | null
          attendee_selection?: string | null
          selected_attendees?: string[] | null
          is_active?: boolean | null
          seating_type?: string | null
          seating_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string
          start_time?: string
          end_time?: string
          location?: string
          type?: string
          speaker?: any | null
          capacity?: number | null
          registered_count?: number | null
          attendee_selection?: string | null
          selected_attendees?: string[] | null
          is_active?: boolean | null
          seating_type?: string | null
          seating_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      dining_options: {
        Row: {
          id: string
          name: string
          date: string
          time: string
          location: string
          address: string
          address_validated: boolean | null
          has_table_assignments: boolean | null
          tables: any | null
          is_active: boolean | null
          display_order: number | null
          seating_type: string | null
          capacity: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          date: string
          time: string
          location: string
          address: string
          address_validated?: boolean | null
          has_table_assignments?: boolean | null
          tables?: any | null
          is_active?: boolean | null
          display_order?: number | null
          seating_type?: string | null
          capacity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          date?: string
          time?: string
          location?: string
          address?: string
          address_validated?: boolean | null
          has_table_assignments?: boolean | null
          tables?: any | null
          is_active?: boolean | null
          display_order?: number | null
          seating_type?: string | null
          capacity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      hotels: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          website: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone: string
          website?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string
          website?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      breakout_sessions: {
        Row: {
          id: string
          title: string
          description: string | null
          track: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          track?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          track?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      import_history: {
        Row: {
          id: string
          source: string
          attendee_ids: string[] | null
          summary: any | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source: string
          attendee_ids?: string[] | null
          summary?: any | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source?: string
          attendee_ids?: string[] | null
          summary?: any | null
          created_at?: string | null
        }
      }
      sponsors: {
        Row: {
          id: string
          name: string
          logo: string
          website: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          logo: string
          website?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          logo?: string
          website?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}