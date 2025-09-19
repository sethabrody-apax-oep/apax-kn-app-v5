import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'

export interface IDLoomFieldMapping {
  id: string
  event_uid: string
  event_name: string
  field_mappings: FieldMapping[]
  created_by: string | null
  last_used_by: string | null
  last_used_at: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_name?: string
  last_used_by_name?: string
}

export interface FieldMapping {
  idloomField: string
  targetField: string
  isRequired: boolean
  sampleValue?: string
  fieldLabel?: string
  fieldType?: string
  isMandatory?: boolean
}

export function useIDLoomMappings() {
  const [mappings, setMappings] = useState<IDLoomFieldMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMappings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, get the mappings with user IDs
      const { data: mappingsData, error: supabaseError } = await supabase
        .from('idloom_field_mappings')
        .select('*')
        .eq('is_active', true)
        .order('last_used_at', { ascending: false })

      if (supabaseError) {
        console.error('Error loading IDLoom mappings:', supabaseError)
        setError(supabaseError.message)
        setMappings([])
        return
      }

      if (!mappingsData || mappingsData.length === 0) {
        setMappings([])
        return
      }

      // Get unique user IDs
      const userIds = new Set<string>()
      mappingsData.forEach(mapping => {
        if (mapping.created_by) userIds.add(mapping.created_by)
        if (mapping.last_used_by) userIds.add(mapping.last_used_by)
      })

      // Fetch user profiles for the user IDs
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .in('user_id', Array.from(userIds))

      if (userError) {
        console.error('Error loading user profiles:', userError)
        // Continue without user names if profiles can't be loaded
      }

      // Create a map of user_id to email
      const userEmailMap = new Map<string, string>()
      if (userProfiles) {
        userProfiles.forEach(profile => {
          userEmailMap.set(profile.user_id, profile.email)
        })
      }

      // Transform the data to include user names
      const transformedData = mappingsData.map(mapping => ({
        ...mapping,
        created_by_name: mapping.created_by ? userEmailMap.get(mapping.created_by) || 'Unknown' : 'Unknown',
        last_used_by_name: mapping.last_used_by ? userEmailMap.get(mapping.last_used_by) || 'Unknown' : 'Unknown'
      }))
      
      setMappings(transformedData)
    } catch (err) {
      console.error('Error loading IDLoom mappings:', err)
      setError('Failed to load IDLoom mappings')
      setMappings([])
    } finally {
      setLoading(false)
    }
  }

  const loadMappingsOld = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('idloom_field_mappings')
        .select('*')
        .eq('is_active', true)
        .order('last_used_at', { ascending: false })

      if (supabaseError) {
        console.error('Error loading IDLoom mappings:', supabaseError)
        setError(supabaseError.message)
        setMappings([])
      } else {
        const transformedData = (data || []).map(mapping => ({
          ...mapping,
          created_by_name: 'Unknown',
          last_used_by_name: 'Unknown'
        }))
        
        setMappings(transformedData)
      }
    } catch (err) {
      console.error('Error loading IDLoom mappings:', err)
      setError('Failed to load IDLoom mappings')
      setMappings([])
    } finally {
      setLoading(false)
    }
  }

  const saveMapping = async (eventUid: string, eventName: string, fieldMappings: FieldMapping[]) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      const mappingData = {
        event_uid: eventUid,
        event_name: eventName,
        field_mappings: fieldMappings,
        created_by: currentUser.id,
        last_used_by: currentUser.id,
        last_used_at: new Date().toISOString(),
        is_active: true
      }

      // Use upsert to handle both create and update
      const { data, error } = await supabase
        .from('idloom_field_mappings')
        .upsert([mappingData], { 
          onConflict: 'event_uid',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving IDLoom mapping:', error)
        throw error
      }

      console.log('Successfully saved IDLoom mapping:', data)
      await loadMappings() // Refresh the list
      return data
    } catch (error) {
      console.error('Error saving IDLoom mapping:', error)
      throw error
    }
  }

  const updateMappingUsage = async (eventUid: string) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('idloom_field_mappings')
        .update({
          last_used_by: currentUser.id,
          last_used_at: new Date().toISOString()
        })
        .eq('event_uid', eventUid)

      if (error) {
        console.error('Error updating mapping usage:', error)
        throw error
      }

      await loadMappings() // Refresh the list
    } catch (error) {
      console.error('Error updating mapping usage:', error)
      throw error
    }
  }

  const getMappingByEventUid = (eventUid: string): IDLoomFieldMapping | null => {
    return mappings.find(mapping => mapping.event_uid === eventUid) || null
  }

  const deleteMappingByEventUid = async (eventUid: string) => {
    try {
      const { error } = await supabase
        .from('idloom_field_mappings')
        .delete()
        .eq('event_uid', eventUid)

      if (error) {
        console.error('Error deleting IDLoom mapping:', error)
        throw error
      }

      await loadMappings() // Refresh the list
    } catch (error) {
      console.error('Error deleting IDLoom mapping:', error)
      throw error
    }
  }

  const deactivateMapping = async (eventUid: string) => {
    try {
      const { error } = await supabase
        .from('idloom_field_mappings')
        .update({ is_active: false })
        .eq('event_uid', eventUid)

      if (error) {
        console.error('Error deactivating IDLoom mapping:', error)
        throw error
      }

      await loadMappings() // Refresh the list
    } catch (error) {
      console.error('Error deactivating IDLoom mapping:', error)
      throw error
    }
  }

  useEffect(() => {
    loadMappings()
  }, [])

  return {
    mappings,
    loading,
    error,
    saveMapping,
    updateMappingUsage,
    getMappingByEventUid,
    deleteMappingByEventUid,
    deactivateMapping,
    refreshMappings: loadMappings
  }
}