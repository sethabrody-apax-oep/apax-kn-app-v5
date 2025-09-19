import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Globe, RefreshCw, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { useCompanyDomains, useCompanyDomainExtraction } from '../../hooks/useCompanyData'
import { EnhancedLogoFetcher } from '../../utils/logoUtils'
import { supabase } from '../../lib/supabase'

interface CompanyDomainManagerProps {
  company: any
  onSave: () => void
  onCancel: () => void
}

export default function CompanyDomainManager({ company, onSave, onCancel }: CompanyDomainManagerProps) {
  const { domains, loading, addDomain, updateDomain, deleteDomain, refreshDomains } = useCompanyDomains(company.id)
  const { extractionResults, extractDomainsFromEmails, syncCompanyDomainsFromEmails } = useCompanyDomainExtraction()
  const [newDomain, setNewDomain] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isFetchingLogos, setIsFetchingLogos] = useState(false)
  const [logoFetchResults, setLogoFetchResults] = useState<any>(null)

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return

    try {
      const cleanDomain = EnhancedLogoFetcher.extractDomain(newDomain)
      await addDomain(cleanDomain, domains.length === 0) // First domain is primary
      setNewDomain('')
    } catch (error) {
      console.error('Error adding domain:', error)
      alert('Failed to add domain. Please try again.')
    }
  }

  const handleSetPrimary = async (domainId: string) => {
    try {
      // First, set all domains for this company to non-primary
      for (const domain of domains) {
        if (domain.is_primary) {
          await updateDomain(domain.id, { is_primary: false })
        }
      }
      
      // Then set the selected domain as primary
      await updateDomain(domainId, { is_primary: true })
    } catch (error) {
      console.error('Error setting primary domain:', error)
      alert('Failed to set primary domain. Please try again.')
    }
  }

  const handleExtractFromEmails = async () => {
    setIsExtracting(true)
    try {
      console.log('Starting domain extraction from emails for all companies...')
      
      // Call the database function to sync domains
      const { data, error } = await supabase.rpc('sync_company_domains_from_emails')
      
      if (error) {
        console.error('Error calling sync_company_domains_from_emails function:', error)
        console.error('Domain extraction error:', error)
        // Handle specific constraint violation errors gracefully
        if (error.code === '23505') {
          alert('Some domains already exist and were skipped. Extraction completed for new domains.')
        } else {
          throw error
        }
      } else {
        const result = data || {}
        const message = result.message || 'Domain extraction completed'
        const inserted = result.inserted || 0
        const skipped = result.skipped || 0
        
        alert(`${message}\nNew domains: ${inserted}\nSkipped (already exist): ${skipped}`)
      }
      
      console.log('Raw function response:', data)
      
      // Handle both array and object responses
      let results
      if (Array.isArray(data) && data.length > 0) {
        results = data[0]
      } else if (data && typeof data === 'object') {
        results = data
      } else {
        results = { companies_processed: 0, domains_added: 0, domains_updated: 0 }
      }
      
      console.log('Processed domain extraction results:', results)
      
      if (results) {
        alert(`Domain extraction completed!\n\nCompanies processed: ${results.companies_processed}\nDomains added: ${results.domains_added}\nDomains updated: ${results.domains_updated}`)
        await refreshDomains()
        onSave() // Refresh parent data
        alert('Domain extraction completed but no results returned.')
      }
    } catch (error) {
      console.error('Error extracting domains:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (!errorMessage.includes('duplicate key')) {
        alert(`Failed to extract domains: ${errorMessage}`)
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFetchLogos = async () => {
    if (domains.length === 0) {
      alert('No domains available for logo fetching')
      return
    }

    setIsFetchingLogos(true)
    try {
      const domainList = domains.map(d => d.domain)
      const logoResult = await EnhancedLogoFetcher.fetchBestLogoFromDomains(domainList)
      
      if (logoResult.success) {
        // Update company logo
        const { error } = await supabase
          .from('standardized_companies')
          .update({ logo: logoResult.url })
          .eq('id', company.id)

        if (error) throw error

        // Update domain logo cache
        const primaryDomain = domains.find(d => d.is_primary) || domains[0]
        if (primaryDomain) {
          await updateDomain(primaryDomain.id, {
            logo_url: logoResult.url,
            logo_last_fetched: new Date().toISOString()
          })
        }

        setLogoFetchResults({
          success: true,
          logoUrl: logoResult.url,
          source: logoResult.source
        })
        
        onSave() // Refresh parent data
      } else {
        setLogoFetchResults({
          success: false,
          error: logoResult.error || 'No logo found'
        })
      }
    } catch (error) {
      console.error('Error fetching logos:', error)
      setLogoFetchResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsFetchingLogos(false)
    }
  }

  const exportDomains = () => {
    const csvContent = [
      ['Company Name', 'Domain', 'Is Primary', 'Source', 'Logo URL'].join(','),
      ...domains.map(d => [
        company.name, d.domain, d.is_primary ? 'Yes' : 'No', d.source, d.logo_url || ''
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company.name.replace(/\s/g, '_')}_domains.csv`
    a.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Manage Domains & Logos: {company.name}
            </h2>
            <p className="text-brand-gray text-sm">
              Manage company domains and automatically fetch logos
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Domain Extraction */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">
                Auto-Extract Domains from Attendee Emails
              </h3>
              <button
                onClick={handleExtractFromEmails}
                disabled={isExtracting}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Extract from Emails
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-blue-800">
              Automatically extract company domains from attendee email addresses to improve logo fetching accuracy.
            </p>
          </div>

          {/* Logo Fetching */}
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-green-900">
                Auto-Fetch Company Logo
              </h3>
              <button
                onClick={handleFetchLogos}
                disabled={isFetchingLogos || domains.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingLogos ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Fetch Best Logo
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-green-800">
              Use registered domains to automatically fetch the best available company logo from multiple sources.
            </p>
            
            {logoFetchResults && (
              <div className={`mt-3 p-3 rounded-lg ${logoFetchResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
                {logoFetchResults.success ? (
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Logo updated successfully!</p>
                      <p className="text-xs text-green-700">Source: {logoFetchResults.source}</p>
                    </div>
                    {logoFetchResults.logoUrl && (
                      <img src={logoFetchResults.logoUrl} alt="Fetched logo" className="h-8 w-auto" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Logo fetch failed</p>
                      <p className="text-xs text-red-700">{logoFetchResults.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current Domains */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-navy">
                Registered Domains ({domains.length})
              </h3>
              {domains.length > 0 && (
                <button
                  onClick={exportDomains}
                  className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
              </div>
            ) : domains.length > 0 ? (
              <div className="space-y-2">
                {domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-4 h-4 text-brand-gray" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-brand-navy">{domain.domain}</span>
                          {domain.is_primary && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            domain.source === 'email_extraction' ? 'bg-green-100 text-green-800' :
                            domain.source === 'website' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {domain.source === 'email_extraction' ? 'Auto-extracted' :
                             domain.source === 'website' ? 'From Website' : 'Manual'}
                          </span>
                        </div>
                        {domain.logo_url && (
                          <div className="text-xs text-brand-gray mt-1">
                            Logo cached: {domain.logo_last_fetched ? new Date(domain.logo_last_fetched).toLocaleDateString() : 'Unknown'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!domain.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(domain.id)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => deleteDomain(domain.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-brand-gray">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No domains registered yet</p>
                <p className="text-xs mt-1">Add domains manually or extract from attendee emails</p>
              </div>
            )}
          </div>

          {/* Add New Domain */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-3">
              Add New Domain
            </h3>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="Enter domain (e.g., company.com)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
              <button
                onClick={handleAddDomain}
                disabled={!newDomain.trim()}
                className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Domain
              </button>
            </div>
          </div>

          {/* Current Company Logo */}
          {company.logo && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-brand-navy mb-3">Current Company Logo</h4>
              <div className="flex items-center space-x-4">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-16 w-auto object-contain border border-gray-200 rounded p-2 bg-white"
                  onError={(e) => {
                    e.currentTarget.src = `https://via.placeholder.com/200x80/0e1821/ffffff?text=${encodeURIComponent(company.name)}`
                  }}
                />
                <div className="text-sm text-brand-gray">
                  <p>Current logo URL: <code className="bg-white px-2 py-1 rounded text-xs">{company.logo}</code></p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}