import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface RawIDLoomData {
  id: string
  idloom_event_uid: string
  idloom_guest_uid: string
  raw_data: any
  import_batch_id: string
  processed: boolean
  processed_at?: string
  attendee_id?: string
  processing_errors: any[]
  import_reviewed: boolean
  import_status: 'pending' | 'processed' | 'failed' | 'skipped' | 'approved' | 'rejected'
  last_synced_at: string
  created_at: string
  updated_at: string
  is_existing_attendee?: boolean
}

export interface ImportBatch {
  batch_id: string
  event_uid: string
  event_name: string
  total_records: number
  processed_records: number
  failed_records: number
  created_at: string
  status: 'importing' | 'completed' | 'failed' | 'processing'
}

// Hook for managing raw IDLoom data imports
export function useRawIDLoomData() {
  const [rawData, setRawData] = useState<RawIDLoomData[]>([])
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRawData = async (eventUid?: string, batchId?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .order('created_at', { ascending: false })

      if (eventUid) {
        query = query.eq('idloom_event_uid', eventUid)
      }
      
      if (batchId) {
        query = query.eq('import_batch_id', batchId)
      }

      const { data, error: supabaseError } = await query

      if (supabaseError) {
        console.error('Error loading raw IDLoom data:', supabaseError)
        setError(supabaseError.message)
        setRawData([])
      } else {
        // Check which records correspond to existing attendees
        const rawRecords = data || []
        const enrichedRecords = await enrichWithExistingAttendeeStatus(rawRecords)
        setRawData(enrichedRecords)
      }
    } catch (err) {
      console.error('Error loading raw IDLoom data:', err)
      setError('Failed to load raw IDLoom data')
      setRawData([])
    } finally {
      setLoading(false)
    }
  }

  const loadImportBatches = async () => {
    try {
      // Get batch statistics using a custom query
      const { data, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select(`
          import_batch_id,
          idloom_event_uid,
          processed,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group by batch and calculate statistics
      const batchMap = new Map<string, any>()
      
      data?.forEach(record => {
        const batchId = record.import_batch_id
        if (!batchMap.has(batchId)) {
          batchMap.set(batchId, {
            batch_id: batchId,
            event_uid: record.idloom_event_uid,
            event_name: record.idloom_event_uid, // We'll need to resolve this separately
            total_records: 0,
            processed_records: 0,
            failed_records: 0,
            created_at: record.created_at,
            status: 'completed'
          })
        }
        
        const batch = batchMap.get(batchId)
        batch.total_records++
        if (record.processed) {
          batch.processed_records++
        }
      })

      setImportBatches(Array.from(batchMap.values()))
    } catch (err) {
      console.error('Error loading import batches:', err)
      setError('Failed to load import batches')
    }
  }

  // Helper function to check which raw records correspond to existing attendees
  const enrichWithExistingAttendeeStatus = async (rawRecords: RawIDLoomData[]): Promise<RawIDLoomData[]> => {
    try {
      if (rawRecords.length === 0) return rawRecords
      
      // Get all unique IDLoom guest UIDs from the raw records
      const guestUids = rawRecords.map(record => record.idloom_guest_uid).filter(Boolean)
      
      console.log('DEBUG: Checking existing attendee status for guest UIDs:', guestUids)
      
      if (guestUids.length === 0) return rawRecords
      
      // Query attendees table to find existing attendees with matching idloom_id
      const { data: existingAttendees, error } = await supabase
        .from('attendees')
        .select('idloom_id')
        .in('idloom_id', guestUids)
        .not('idloom_id', 'is', null)
        .neq('idloom_id', '')
      
      console.log('DEBUG: Query result - existing attendees with idloom_id:', existingAttendees)
      
      if (error) {
        console.error('Error checking existing attendees:', error)
        // Return original records without enrichment if query fails
        return rawRecords
      }
      
      // Create a Set of existing IDLoom IDs for fast lookup
      const existingIdloomIds = new Set(
        (existingAttendees || []).map(attendee => attendee.idloom_id)
      )
      
      console.log('DEBUG: Set of existing IDLoom IDs found in database:', Array.from(existingIdloomIds))
      
      // Enrich raw records with existing attendee status
      const enrichedRecords = rawRecords.map(record => ({
        ...record,
        is_existing_attendee: existingIdloomIds.has(record.idloom_guest_uid)
      }))
      
      // Debug each record's status
      enrichedRecords.forEach(record => {
        console.log(`DEBUG: Guest UID "${record.idloom_guest_uid}" -> is_existing_attendee: ${record.is_existing_attendee}`)
      })
      
      console.log(`Enriched ${enrichedRecords.length} raw records with existing attendee status`)
      console.log(`Found ${existingIdloomIds.size} existing attendees out of ${guestUids.length} guest UIDs`)
      
      return enrichedRecords
    } catch (error) {
      console.error('Error enriching with existing attendee status:', error)
      // Return original records without enrichment if anything fails
      return rawRecords
    }
  }
  const bulkInsertRawData = async (
    idloomEventUid: string, 
    eventName: string,
    guestData: any[], 
    batchId?: string
  ): Promise<string> => {
    try {
      const importBatchId = batchId || crypto.randomUUID()
      
      console.log(`Starting bulk insert of ${guestData.length} raw IDLoom records for batch ${importBatchId}`)
      
      // Prepare raw data records
      const rawRecords = guestData.map(guest => ({
        idloom_event_uid: idloomEventUid,
        idloom_guest_uid: guest.uid || guest.id || crypto.randomUUID(),
        raw_data: guest,
        import_batch_id: importBatchId,
        processed: false,
        attendee_id: null,
        processing_errors: [],
        import_reviewed: false,
        import_status: 'pending',
        import_reviewed: false,
        import_status: 'pending',
        last_synced_at: new Date().toISOString()
      }))

      // Insert in chunks to avoid timeout
      const chunkSize = 100
      const chunks = []
      for (let i = 0; i < rawRecords.length; i += chunkSize) {
        chunks.push(rawRecords.slice(i, i + chunkSize))
      }

      for (const chunk of chunks) {
        const { error } = await supabase
          .from('raw_attendee_data_idloom')
          .upsert(chunk, { 
            onConflict: 'idloom_event_uid,idloom_guest_uid',
            ignoreDuplicates: false 
          })

        if (error) {
          console.error('Error inserting raw data chunk:', error)
          throw error
        }
      }

      console.log(`Successfully inserted ${rawRecords.length} raw IDLoom records`)
      await loadRawData()
      await loadImportBatches()
      
      return importBatchId
    } catch (error) {
      console.error('Error bulk inserting raw IDLoom data:', error)
      throw error
    }
  }

  const markAsProcessed = async (rawDataId: string, attendeeId: string) => {
    try {
      const { error } = await supabase
        .from('raw_attendee_data_idloom')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          attendee_id: attendeeId
        })
        .eq('id', rawDataId)

      if (error) throw error
      await loadRawData()
    } catch (error) {
      console.error('Error marking raw data as processed:', error)
      throw error
    }
  }

  const markAsError = async (rawDataId: string, errors: any[]) => {
    try {
      const { error } = await supabase
        .from('raw_attendee_data_idloom')
        .update({
          processing_errors: errors,
          updated_at: new Date().toISOString()
        })
        .eq('id', rawDataId)

      if (error) throw error
      await loadRawData()
    } catch (error) {
      console.error('Error marking raw data with errors:', error)
      throw error
    }
  }

  const deleteRawData = async (id: string) => {
    try {
      const { error } = await supabase
        .from('raw_attendee_data_idloom')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadRawData()
      await loadImportBatches()
    } catch (error) {
      console.error('Error deleting raw IDLoom data:', error)
      throw error
    }
  }

  const deleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('raw_attendee_data_idloom')
        .delete()
        .eq('import_batch_id', batchId)

      if (error) throw error
      await loadRawData()
      await loadImportBatches()
    } catch (error) {
      console.error('Error deleting import batch:', error)
      throw error
    }
  }

  const getUnprocessedData = async (eventUid?: string): Promise<RawIDLoomData[]> => {
    try {
      let query = supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })

      if (eventUid) {
        query = query.eq('idloom_event_uid', eventUid)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting unprocessed data:', error)
      throw error
    }
  }

  const getBatchStatistics = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select('processed, processing_errors')
        .eq('import_batch_id', batchId)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        processed: data?.filter(r => r.processed).length || 0,
        failed: data?.filter(r => r.processing_errors && r.processing_errors.length > 0).length || 0,
        pending: data?.filter(r => !r.processed && (!r.processing_errors || r.processing_errors.length === 0)).length || 0
      }

      return stats
    } catch (error) {
      console.error('Error getting batch statistics:', error)
      throw error
    }
  }

  useEffect(() => {
    loadRawData()
    loadImportBatches()
  }, [])

  return {
    rawData,
    importBatches,
    loading,
    error,
    bulkInsertRawData,
    markAsProcessed,
    markAsError,
    deleteRawData,
    deleteBatch,
    getUnprocessedData,
    getBatchStatistics,
    refreshRawData: loadRawData,
    refreshImportBatches: loadImportBatches
  }
}