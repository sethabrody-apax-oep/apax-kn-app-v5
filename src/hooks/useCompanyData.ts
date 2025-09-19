import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface StandardizedCompany {
  id: string
  name: string
  sector: string
  geography: string
  subsector: string
  logo?: string
  website?: string
  fund_analytics_category?: string
  is_parent_company: boolean
  parent_company_id?: string
  parent_company_name?: string
  description?: string
  aliases_count?: number
  apax_partners_count?: number
  seating_notes?: string
  priority_networking_attendees?: string[]
  created_at: string
  updated_at: string
}

export interface CompanyAlias {
  id: string
  alias: string
  standardized_company_id: string
  created_at: string
  updated_at: string
}

export interface CompanyApaxPartner {
  id: string
  standardized_company_id: string
  attendee_id: string
  attendee_name?: string
  attendee_email?: string
  created_at: string
  updated_at: string
}

export interface CompanyDomain {
  id: string
  standardized_company_id: string
  domain: string
  is_primary: boolean
  source: 'manual' | 'email_extraction' | 'website'
  logo_url?: string
  logo_last_fetched?: string
  created_at: string
  updated_at: string
}

// Hook for standardized companies
export function useStandardizedCompanies() {
  const [companies, setCompanies] = useState<StandardizedCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load companies with enriched data including parent company names and counts
      const { data, error: supabaseError } = await supabase
        .from('standardized_companies')
        .select(`
          *,
          parent_company:parent_company_id(name),
          aliases:company_aliases(count),
          apax_partners:company_apax_partners(count)
        `)
        .order('name', { ascending: true })

      if (supabaseError) {
        console.error('Error loading companies:', supabaseError)
        setError(supabaseError.message)
        setCompanies([])
      } else {
        // Transform the data to include computed fields
        const transformedData = (data || []).map(company => ({
          ...company,
          parent_company_name: company.parent_company?.name || null,
          aliases_count: company.aliases?.[0]?.count || 0,
          apax_partners_count: company.apax_partners?.[0]?.count || 0
        }))
        
        setCompanies(transformedData)
      }
    } catch (err) {
      console.error('Error loading companies:', err)
      setError('Failed to load companies')
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  return {
    companies,
    loading,
    error,
    refreshCompanies: loadCompanies
  }
}

// Hook for company aliases
export function useCompanyAliases(companyId?: string) {
  const [aliases, setAliases] = useState<CompanyAlias[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAliases = async () => {
    if (!companyId) {
      setAliases([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('company_aliases')
        .select('*')
        .eq('standardized_company_id', companyId)
        .order('alias', { ascending: true })

      if (supabaseError) {
        console.error('Error loading aliases:', supabaseError)
        setError(supabaseError.message)
        setAliases([])
      } else {
        setAliases(data || [])
      }
    } catch (err) {
      console.error('Error loading aliases:', err)
      setError('Failed to load aliases')
      setAliases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAliases()
  }, [companyId])

  return {
    aliases,
    loading,
    error,
    refreshAliases: loadAliases
  }
}

// Hook for company Apax partners
export function useCompanyApaxPartners(companyId?: string) {
  const [partners, setPartners] = useState<CompanyApaxPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPartners = async () => {
    if (!companyId) {
      setPartners([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('company_apax_partners')
        .select(`
          *,
          attendees!inner(
            first_name,
            last_name,
            email,
            title,
            company
          )
        `)
        .eq('standardized_company_id', companyId)

      if (supabaseError) {
        console.error('Error loading partners:', supabaseError)
        setError(supabaseError.message)
        setPartners([])
      } else {
        // Transform the data to include attendee details
        const transformedData = (data || []).map(partner => ({
          ...partner,
          attendee_name: `${partner.attendees.first_name} ${partner.attendees.last_name}`,
          attendee_email: partner.attendees.email
        }))
        
        setPartners(transformedData)
      }
    } catch (err) {
      console.error('Error loading partners:', err)
      setError('Failed to load partners')
      setPartners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPartners()
  }, [companyId])

  return {
    partners,
    loading,
    error,
    refreshPartners: loadPartners
  }
}

// Hook for company statistics and analytics
export function useCompanyStatistics() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use the database function to get comprehensive statistics
      const { data, error: supabaseError } = await supabase
        .rpc('get_company_statistics')

      if (supabaseError) {
        console.error('Error loading company statistics:', supabaseError)
        setError(supabaseError.message)
        setStats({})
      } else {
        setStats(data || {})
      }
    } catch (err) {
      console.error('Error loading statistics:', err)
      setError('Failed to load statistics')
      setStats({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [])

  return {
    stats,
    loading,
    error,
    refreshStatistics: loadStatistics
  }
}

// Hook for company domains
export function useCompanyDomains(companyId?: string) {
  const [domains, setDomains] = useState<CompanyDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDomains = async () => {
    if (!companyId) {
      setDomains([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error: supabaseError } = await supabase
        .from('company_domains')
        .select('*')
        .eq('standardized_company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('domain', { ascending: true })

      if (supabaseError) {
        console.error('Error loading domains:', supabaseError)
        setError(supabaseError.message)
        setDomains([])
      } else {
        setDomains(data || [])
      }
    } catch (err) {
      console.error('Error loading domains:', err)
      setError('Failed to load domains')
      setDomains([])
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async (domain: string, isPrimary: boolean = false, source: string = 'manual') => {
    try {
      const { error } = await supabase
        .from('company_domains')
        .insert([{
          standardized_company_id: companyId,
          domain: domain.toLowerCase(),
          is_primary: isPrimary,
          source
        }])

      if (error) throw error
      await loadDomains()
    } catch (error) {
      console.error('Error adding domain:', error)
      throw error
    }
  }

  const updateDomain = async (domainId: string, updates: Partial<CompanyDomain>) => {
    try {
      const { error } = await supabase
        .from('company_domains')
        .update(updates)
        .eq('id', domainId)

      if (error) throw error
      await loadDomains()
    } catch (error) {
      console.error('Error updating domain:', error)
      throw error
    }
  }

  const deleteDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('company_domains')
        .delete()
        .eq('id', domainId)

      if (error) throw error
      await loadDomains()
    } catch (error) {
      console.error('Error deleting domain:', error)
      throw error
    }
  }

  useEffect(() => {
    loadDomains()
  }, [companyId])

  return {
    domains,
    loading,
    error,
    addDomain,
    updateDomain,
    deleteDomain,
    refreshDomains: loadDomains
  }
}

// Hook for domain extraction and logo fetching
export function useCompanyDomainExtraction() {
  const [extractionResults, setExtractionResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractDomainsFromEmails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Calling extract_domains_from_attendee_emails function...')
      
      const { data, error: supabaseError } = await supabase
        .rpc('extract_domains_from_attendee_emails')
      
      console.log('Function response:', { data, error: supabaseError })

      if (supabaseError) {
        console.error('Error extracting domains:', supabaseError)
        setError(supabaseError.message)
        setExtractionResults(null)
      } else {
        console.log('Successfully extracted domains:', data)
        setExtractionResults(data || [])
      }
    } catch (err) {
      console.error('Error extracting domains:', err)
      setError('Failed to extract domains')
      setExtractionResults(null)
    } finally {
      setLoading(false)
    }
  }

  const syncCompanyDomainsFromEmails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Calling sync_company_domains_from_emails function...')
      
      const { data, error: supabaseError } = await supabase
        .rpc('sync_company_domains_from_emails')
      
      console.log('Sync function response:', { data, error: supabaseError })

      if (supabaseError) {
        console.error('Error syncing domains:', supabaseError)
        setError(supabaseError.message)
        return null
      } else {
        // Handle both array and object responses
        let results
        if (Array.isArray(data) && data.length > 0) {
          results = data[0]
        } else if (data && typeof data === 'object') {
          results = data
        } else {
          results = { companies_processed: 0, domains_added: 0, domains_updated: 0 }
        }
        
        console.log('Returning sync results:', results)
        return results
      }
    } catch (err) {
      console.error('Error syncing domains:', err)
      setError('Failed to sync domains')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    extractionResults,
    loading,
    error,
    extractDomainsFromEmails,
    syncCompanyDomainsFromEmails
  }
}