import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SeatingConfiguration {
  id: string
  agenda_item_id?: string
  dining_option_id?: string
  layout_template_id?: string
  layout_type: 'table' | 'classroom' | 'auditorium' | 'custom'
  layout_config: any
  configuration_status: 'waiting' | 'configured' | 'active' | 'archived'
  auto_assignment_rules: any
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SeatAssignment {
  id: string
  seating_configuration_id: string
  attendee_id: string
  attendee_first_name?: string
  attendee_last_name?: string
  table_name?: string
  seat_number?: number
  row_number?: number
  column_number?: number
  seat_position: { x: number; y: number }
  assignment_type: 'manual' | 'auto' | 'self-selected'
  assigned_at: string
  notes: string
  // Additional attendee details from view
  attendee_email?: string
  attendee_title?: string
  attendee_company?: string
  attendee_photo?: string
  attendee_attributes?: any
  attendee_dietary_requirements?: string
}

// Hook for seating configurations
export function useSeatingConfigurations() {
  const [configurations, setConfigurations] = useState<SeatingConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfigurations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('seating_configurations')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('Error loading seating configurations:', supabaseError)
        setError(supabaseError.message)
        setConfigurations([])
      } else {
        setConfigurations(data || [])
      }
    } catch (err) {
      console.error('Error loading seating configurations:', err)
      setError('Failed to load seating configurations')
      setConfigurations([])
    } finally {
      setLoading(false)
    }
  }

  const createConfiguration = async (configData: Omit<SeatingConfiguration, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating seating configuration in database:', configData)
      
      const { data, error } = await supabase
        .from('seating_configurations')
        .insert([configData])
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating configuration:', error)
        throw error
      }
      
      console.log('Configuration created successfully:', data)
      await loadConfigurations()
      return data
    } catch (error) {
      console.error('Error creating seating configuration:', error)
      throw error
    }
  }

  const updateConfiguration = async (id: string, updates: Partial<SeatingConfiguration>) => {
    try {
      console.log('Updating seating configuration:', id, updates)
      
      const { error } = await supabase
        .from('seating_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating configuration:', error)
        throw error
      }
      
      console.log('Configuration updated successfully')
      await loadConfigurations()
      return true
    } catch (error) {
      console.error('Error updating seating configuration:', error)
      throw error
    }
  }

  useEffect(() => {
    loadConfigurations()
  }, [])

  return {
    configurations,
    loading,
    error,
    createConfiguration,
    updateConfiguration,
    refreshConfigurations: loadConfigurations
  }
}

// Hook for getting importable seating configurations
export function useImportableConfigurations(currentLayoutType?: string) {
  const [importableConfigs, setImportableConfigs] = useState<SeatingConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadImportableConfigurations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('seating_configurations')
        .select(`
          *,
          agenda_items(title),
          dining_options(name)
        `)
        .eq('configuration_status', 'configured')
        .order('created_at', { ascending: false })

      // Filter by layout type if specified
      if (currentLayoutType) {
        query = query.eq('layout_type', currentLayoutType)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) {
        console.error('Error loading importable configurations:', supabaseError)
        setError(supabaseError.message)
        setImportableConfigs([])
      } else {
        // Transform data to include event names
        const transformedData = (data || []).map(config => ({
          ...config,
          eventName: config.agenda_items?.title || config.dining_options?.name || 'Unknown Event'
        }))
        setImportableConfigs(transformedData)
      }
    } catch (err) {
      console.error('Error loading importable configurations:', err)
      setError('Failed to load importable configurations')
      setImportableConfigs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImportableConfigurations()
  }, [currentLayoutType])

  return {
    importableConfigs,
    loading,
    error,
    refreshImportableConfigs: loadImportableConfigurations
  }
}

// Hook for importing seating plans (layout + assignments)
export function useSeatingPlanImport() {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importSeatingPlan = async (
    sourceConfigId: string,
    targetConfigId: string
  ): Promise<{ layout: any; assignmentCount: number }> => {
    try {
      setImporting(true)
      setError(null)

      // 1. Fetch source configuration with layout
      const { data: sourceConfig, error: configError } = await supabase
        .from('seating_configurations')
        .select('layout_config, layout_type')
        .eq('id', sourceConfigId)
        .single()

      if (configError) {
        throw new Error(`Failed to load source configuration: ${configError.message}`)
      }

      // 2. Fetch source seat assignments
      const { data: sourceAssignments, error: assignmentsError } = await supabase
        .from('seat_assignments')
        .select('*')
        .eq('seating_configuration_id', sourceConfigId)

      if (assignmentsError) {
        throw new Error(`Failed to load source assignments: ${assignmentsError.message}`)
      }

      // 3. Update target configuration with source layout
      const { error: updateError } = await supabase
        .from('seating_configurations')
        .update({
          layout_config: sourceConfig.layout_config,
          layout_type: sourceConfig.layout_type,
          configuration_status: 'configured'
        })
        .eq('id', targetConfigId)

      if (updateError) {
        throw new Error(`Failed to update target configuration: ${updateError.message}`)
      }

      // 4. Copy seat assignments to target configuration
      if (sourceAssignments && sourceAssignments.length > 0) {
        // Delete existing assignments for target configuration
        const { error: deleteError } = await supabase
          .from('seat_assignments')
          .delete()
          .eq('seating_configuration_id', targetConfigId)

        if (deleteError) {
          throw new Error(`Failed to clear target assignments: ${deleteError.message}`)
        }

        // Prepare new assignments for target configuration
        const newAssignments = sourceAssignments.map(assignment => ({
          seating_configuration_id: targetConfigId,
          attendee_id: assignment.attendee_id,
          table_name: assignment.table_name,
          seat_number: assignment.seat_number,
          row_number: assignment.row_number,
          column_number: assignment.column_number,
          seat_position: assignment.seat_position,
          assignment_type: 'manual',
          assigned_at: new Date().toISOString(),
          notes: assignment.notes || '',
          is_blocked: assignment.is_blocked || false
        }))

        // Insert new assignments
        const { error: insertError } = await supabase
          .from('seat_assignments')
          .insert(newAssignments)

        if (insertError) {
          throw new Error(`Failed to copy assignments: ${insertError.message}`)
        }
      }

      return {
        layout: sourceConfig.layout_config,
        assignmentCount: sourceAssignments?.length || 0
      }
    } catch (err) {
      console.error('Error importing seating plan:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setImporting(false)
    }
  }

  return {
    importing,
    error,
    importSeatingPlan
  }
}

// Hook for seat assignments
export function useSeatAssignments(configurationId: string) {
  const [assignments, setAssignments] = useState<SeatAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realTimeSubscription, setRealTimeSubscription] = useState<any>(null)

  const loadAssignments = async () => {
    if (!configurationId) {
      setAssignments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Load seat assignments with attendee details
      const { data, error: supabaseError } = await supabase
        .from('seat_assignments')
        .select(`
          *,
          attendees!inner(
            first_name,
            last_name,
            email,
            title,
            company,
            photo,
            attributes,
            dietary_requirements
          )
        `)
        .eq('seating_configuration_id', configurationId)
        .order('table_name', { ascending: true })
        .order('seat_number', { ascending: true })

      if (supabaseError) {
        console.error('Error loading seat assignments:', supabaseError)
        setError(supabaseError.message)
        setAssignments([])
      } else {
        // Transform the data to include attendee details at the top level
        const transformedData = (data || []).map(assignment => ({
          ...assignment,
          attendee_first_name: assignment.attendees?.first_name,
          attendee_last_name: assignment.attendees?.last_name,
          attendee_email: assignment.attendees?.email,
          attendee_title: assignment.attendees?.title,
          attendee_company: assignment.attendees?.company,
          attendee_photo: assignment.attendees?.photo,
          attendee_attributes: assignment.attendees?.attributes,
          attendee_dietary_requirements: assignment.attendees?.dietary_requirements
        }))
        
        console.log('Loaded seat assignments with attendee details:', transformedData)
        setAssignments(transformedData)
      }
    } catch (err) {
      console.error('Error loading seat assignments:', err)
      setError('Failed to load seat assignments')
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription for seat assignments
  useEffect(() => {
    if (!configurationId) return

    console.log('Setting up real-time subscription for configuration:', configurationId)
    
    const subscription = supabase
      .channel(`seat_assignments_${configurationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_assignments',
          filter: `seating_configuration_id=eq.${configurationId}`
        },
        (payload) => {
          console.log('Real-time seat assignment change:', payload)
          // Reload assignments when changes occur
          loadAssignments()
        }
      )
      .subscribe()

    setRealTimeSubscription(subscription)

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription')
      subscription.unsubscribe()
    }
  }, [configurationId])
  const bulkUpdateAssignments = async (assignmentData: Omit<SeatAssignment, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      console.log('Bulk updating assignments for configuration:', configurationId)
      console.log('Assignment data:', assignmentData)

      // First, delete existing assignments for this configuration
      const { error: deleteError } = await supabase
        .from('seat_assignments')
        .delete()
        .eq('seating_configuration_id', configurationId)

      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError)
        throw deleteError
      }

      // Then insert new assignments
      if (assignmentData.length > 0) {
        // Clean the data to only include fields that exist in the table
        const cleanedData = assignmentData.map(assignment => ({
          seating_configuration_id: assignment.seating_configuration_id,
          attendee_id: assignment.attendee_id,
          table_name: assignment.table_name,
          seat_number: assignment.seat_number,
          row_number: assignment.row_number,
          column_number: assignment.column_number,
          seat_position: assignment.seat_position,
          assignment_type: assignment.assignment_type,
          assigned_at: assignment.assigned_at,
          notes: assignment.notes,
          is_blocked: assignment.is_blocked || false
        }))
        
        const { error: insertError } = await supabase
          .from('seat_assignments')
          .insert(cleanedData)

        if (insertError) {
          console.error('Error inserting new assignments:', insertError)
          throw insertError
        }
      }

      console.log('Successfully updated seat assignments')
      // Force reload assignments to get updated data with attendee details
      await loadAssignments()
    } catch (error) {
      console.error('Error updating seat assignments:', error)
      throw error
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [configurationId])

  return {
    assignments,
    loading,
    error,
    bulkUpdateAssignments,
    refreshAssignments: loadAssignments
  }
}

// Hook for getting events that need seating configuration
export function useEventsWithSeating() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEventsWithSeating = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all seating configurations
      const { data: seatingConfigs, error: seatingError } = await supabase
        .from('seating_configurations')
        .select('*')

      if (seatingError) throw seatingError

      // Create maps for quick lookup
      const agendaSeatingMap = new Map()
      const diningSeatingMap = new Map()
      
      seatingConfigs?.forEach(config => {
        if (config.agenda_item_id) {
          agendaSeatingMap.set(config.agenda_item_id, config)
        }
        if (config.dining_option_id) {
          diningSeatingMap.set(config.dining_option_id, config)
        }
      })
      
      // Load agenda items with assigned seating
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_items')
        .select('id, title, date, start_time, end_time, location, type, seating_type, capacity')
        .eq('seating_type', 'assigned')
        .eq('is_active', true)

      if (agendaError) throw agendaError

      // Load dining options with assigned seating
      const { data: diningData, error: diningError } = await supabase
        .from('dining_options')
        .select('id, name, date, time, location, seating_type, capacity')
        .eq('seating_type', 'assigned')
        .eq('is_active', true)

      if (diningError) throw diningError

      // Combine and format the data
      const formattedEvents = [
        ...(agendaData || []).map(item => ({
          id: item.id,
          name: item.title,
          type: 'agenda' as const,
          date: item.date,
          time: item.start_time,
          location: item.location,
          capacity: item.capacity,
          seatingConfig: agendaSeatingMap.get(item.id) || null,
          status: agendaSeatingMap.get(item.id)?.configuration_status || 'waiting'
        })),
        ...(diningData || []).map(option => ({
          id: option.id,
          name: option.name,
          type: 'dining' as const,
          date: option.date,
          time: option.time,
          location: option.location,
          capacity: option.capacity || undefined,
          seatingConfig: diningSeatingMap.get(option.id) || null,
          status: diningSeatingMap.get(option.id)?.configuration_status || 'waiting'
        }))
      ]

      setEvents(formattedEvents)
    } catch (err) {
      console.error('Error loading events with seating:', err)
      setError('Failed to load events with seating')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEventsWithSeating()
  }, [])

  return {
    events,
    loading,
    error,
    refreshEvents: loadEventsWithSeating
  }
}