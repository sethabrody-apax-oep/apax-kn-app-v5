import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building, Crown, Search, Download, AlertCircle, Users, List, Merge, Filter, BarChart3, TrendingUp, X, RefreshCw } from 'lucide-react'
import { useStandardizedCompanies } from '../../hooks/useCompanyData'
import { supabase } from '../../lib/supabase'
import { EnhancedLogoFetcher } from '../../utils/logoUtils'
import CompanyForm from './CompanyForm'
import BulkAliasManager from './BulkAliasManager'
import ApaxPartnerAssignmentModal from './ApaxPartnerAssignmentModal'
import CompanyMergeModal from './CompanyMergeModal'
import CompanyMigrationTool from './CompanyMigrationTool'
import CompanyDomainManager from './CompanyDomainManager'
import CompanyAttendeeCount from './CompanyAttendeeCount'

export default function CompanyManagement() {
  const { companies, loading, error, refreshCompanies } = useStandardizedCompanies()
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [geographyFilter, setGeographyFilter] = useState('all')
  const [parentFilter, setParentFilter] = useState('all')
  const [showBulkAliasManager, setShowBulkAliasManager] = useState(false)
  const [showApaxPartnerModal, setShowApaxPartnerModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showMigrationTool, setShowMigrationTool] = useState(false)
  const [showDomainManager, setShowDomainManager] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'sector' | 'geography' | 'aliases' | 'partners'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSector = sectorFilter === 'all' || company.sector === sectorFilter
    const matchesGeography = geographyFilter === 'all' || company.geography === geographyFilter
    const matchesParent = parentFilter === 'all' || 
      (parentFilter === 'parent' && company.is_parent_company) ||
      (parentFilter === 'subsidiary' && !company.is_parent_company && company.parent_company_id) ||
      (parentFilter === 'independent' && !company.is_parent_company && !company.parent_company_id)
    
    return matchesSearch && matchesSector && matchesGeography && matchesParent
  })

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'sector':
        aValue = a.sector
        bValue = b.sector
        break
      case 'geography':
        aValue = a.geography
        bValue = b.geography
        break
      case 'aliases':
        aValue = a.aliases_count || 0
        bValue = b.aliases_count || 0
        break
      case 'partners':
        aValue = a.apax_partners_count || 0
        bValue = b.apax_partners_count || 0
        break
      default:
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleBulkLogoUpdate = async () => {
    if (!confirm('This will attempt to fetch logos for all companies using their registered domains. This may take several minutes. Continue?')) {
      return
    }

    try {
      const companiesWithDomains = companies.filter(c => c.id) // All companies for now
      
      if (companiesWithDomains.length === 0) {
        alert('No companies available for logo updates.')
        return
      }

      // Use the enhanced logo fetcher
      const results = await EnhancedLogoFetcher.batchUpdateCompanyLogos(
        companiesWithDomains,
        (progress, total) => {
          console.log(`Logo update progress: ${progress}/${total}`)
        }
      )

      alert(`Logo update completed!\n\nUpdated: ${results.updated}\nFailed: ${results.failed}\n\nCheck console for detailed results.`)
      console.log('Detailed logo update results:', results.results)
      
      await refreshCompanies()
    } catch (error) {
      console.error('Error updating logos:', error)
      alert(`Failed to update logos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company)
    setShowForm(true)
  }

  const handleDeleteCompany = async (id: string) => {
    if (confirm('Are you sure you want to delete this company? This will also remove all aliases and Apax partner assignments.')) {
      try {
        const { error } = await supabase
          .from('standardized_companies')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        await refreshCompanies()
      } catch (error) {
        console.error('Error deleting company:', error)
        alert('Failed to delete company. Please try again.')
      }
    }
  }

  const handleMergeCompanies = async (sourceId: string, targetId: string) => {
    try {
      console.log('Starting company merge:', { sourceId, targetId })
      
      // Get source and target company details
      const sourceCompany = companies.find(c => c.id === sourceId)
      const targetCompany = companies.find(c => c.id === targetId)
      
      if (!sourceCompany || !targetCompany) {
        throw new Error('Source or target company not found')
      }
      
      // 1. Add source company name as an alias of target company
      const { error: aliasError } = await supabase
        .from('company_aliases')
        .insert([{
          alias: sourceCompany.name,
          standardized_company_id: targetId
        }])
      
      if (aliasError && aliasError.code !== '23505') { // Ignore duplicate alias errors
        throw aliasError
      }
      
      // 2. Update all attendees with source company name to target company name
      const { error: attendeeError } = await supabase
        .from('attendees')
        .update({ company_name_standardized: targetCompany.name })
        .eq('company_name_standardized', sourceCompany.name)
      
      if (attendeeError) {
        console.error('Error updating attendees:', attendeeError)
        // Don't throw here as this might not be critical
      }
      
      // 3. Transfer Apax partner assignments from source to target
      const { data: sourcePartners, error: partnersError } = await supabase
        .from('company_apax_partners')
        .select('attendee_id')
        .eq('standardized_company_id', sourceId)
      
      if (partnersError) {
        console.error('Error fetching source partners:', partnersError)
      } else if (sourcePartners && sourcePartners.length > 0) {
        // Check current target company partner count
        const { data: targetPartners } = await supabase
          .from('company_apax_partners')
          .select('attendee_id')
          .eq('standardized_company_id', targetId)
        
        const currentTargetCount = targetPartners?.length || 0
        const partnersToTransfer = sourcePartners.slice(0, Math.max(0, 3 - currentTargetCount))
        
        if (partnersToTransfer.length > 0) {
          // Insert new partner assignments for target company
          const { error: insertPartnersError } = await supabase
            .from('company_apax_partners')
            .insert(partnersToTransfer.map(p => ({
              standardized_company_id: targetId,
              attendee_id: p.attendee_id
            })))
          
          if (insertPartnersError && insertPartnersError.code !== '23505') {
            console.error('Error transferring partners:', insertPartnersError)
          }
        }
        
        // Delete source company partner assignments
        const { error: deletePartnersError } = await supabase
          .from('company_apax_partners')
          .delete()
          .eq('standardized_company_id', sourceId)
        
        if (deletePartnersError) {
          console.error('Error deleting source partners:', deletePartnersError)
        }
      }
      
      // 4. Delete the source company (this will cascade delete aliases due to foreign key)
      const { error: deleteError } = await supabase
        .from('standardized_companies')
        .delete()
        .eq('id', sourceId)
      
      if (deleteError) {
        throw deleteError
      }
      
      console.log('Company merge completed successfully')
      await refreshCompanies()
      setShowMergeModal(false)
      setSelectedCompany(null)
      
      alert(`Successfully merged "${sourceCompany.name}" into "${targetCompany.name}"`)
      
    } catch (error) {
      console.error('Error merging companies:', error)
      alert(`Failed to merge companies: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const exportCompanies = () => {
    const csvContent = [
      ['Name', 'Sector', 'Geography', 'Subsector', 'Is Parent', 'Parent Company', 'Logo', 'Website', 'Aliases Count', 'Apax Partners Count'].join(','),
      ...companies.map(c => [
        c.name,
        c.sector,
        c.geography,
        c.subsector,
        c.is_parent_company ? 'Yes' : 'No',
        c.parent_company_name || '',
        c.logo || '',
        c.website || '',
        c.aliases_count || 0,
        c.apax_partners_count || 0
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'standardized_companies.csv'
    a.click()
  }

  const getCompanyStats = () => {
    const stats = {
      total: companies.length,
      parents: companies.filter(c => c.is_parent_company).length,
      subsidiaries: companies.filter(c => c.parent_company_id).length,
      independent: companies.filter(c => !c.is_parent_company && !c.parent_company_id).length,
      totalAliases: companies.reduce((sum, c) => sum + (c.aliases_count || 0), 0),
      totalPartners: companies.reduce((sum, c) => sum + (c.apax_partners_count || 0), 0),
      avgAliasesPerCompany: companies.length > 0 ? (companies.reduce((sum, c) => sum + (c.aliases_count || 0), 0) / companies.length).toFixed(1) : '0',
      companiesWithPartners: companies.filter(c => (c.apax_partners_count || 0) > 0).length
    }
    return stats
  }

  const stats = getCompanyStats()

  const getCompanyIcon = (company: any) => {
    if (company.is_parent_company) {
      return <Crown className="w-4 h-4 text-yellow-600" title="Parent Company" />
    }
    if (company.parent_company_id) {
      return <Building className="w-4 h-4 text-blue-600" title="Subsidiary" />
    }
    return <Building className="w-4 h-4 text-gray-600" title="Independent Company" />
  }

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'Apax Digital': return 'bg-purple-100 text-purple-800'
      case 'Services': return 'bg-blue-100 text-blue-800'
      case 'Internet & Consumer': return 'bg-green-100 text-green-800'
      case 'Tech': return 'bg-orange-100 text-orange-800'
      case 'Healthcare': return 'bg-red-100 text-red-800'
      case 'Apax': return 'bg-indigo-100 text-indigo-800'
      case 'Apax OEP': return 'bg-pink-100 text-pink-800'
      case 'Impact': return 'bg-teal-100 text-teal-800'
      case 'Vendors/Sponsors': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (showForm) {
    return (
      <CompanyForm
        company={selectedCompany}
        onManageApaxPartners={selectedCompany ? (company) => {
          setSelectedCompany(company)
          setShowApaxPartnerModal(true)
          setShowForm(false) // Close the form to show the modal
        } : undefined}
        onManageDomains={selectedCompany ? (company) => {
          setSelectedCompany(company)
          setShowDomainManager(true)
          setShowForm(false) // Close the form to show the modal
        } : undefined}
        onSave={async (companyData) => {
          try {
            if (selectedCompany) {
              const { error } = await supabase
                .from('standardized_companies')
                .update(companyData)
                .eq('id', selectedCompany.id)
              if (error) throw error
            } else {
              const { error } = await supabase
                .from('standardized_companies')
                .insert([companyData])
              if (error) throw error
            }
            await refreshCompanies()
            setShowForm(false)
            setSelectedCompany(null)
          } catch (error) {
            console.error('Error saving company:', error)
            alert('Failed to save company. Please try again.')
          }
        }}
        onCancel={() => {
          setShowForm(false)
          setSelectedCompany(null)
        }}
      />
    )
  }

  if (showBulkAliasManager && selectedCompany) {
    return (
      <BulkAliasManager
        company={selectedCompany}
        onSave={refreshCompanies}
        onCancel={() => { setShowBulkAliasManager(false); setSelectedCompany(null); }}
      />
    )
  }

  if (showApaxPartnerModal && selectedCompany) {
    return (
      <ApaxPartnerAssignmentModal
        company={selectedCompany}
        onSave={refreshCompanies}
        onCancel={() => { setShowApaxPartnerModal(false); setSelectedCompany(null); }}
      />
    )
  }

  if (showDomainManager && selectedCompany) {
    return (
      <CompanyDomainManager
        company={selectedCompany}
        onSave={refreshCompanies}
        onCancel={() => { setShowDomainManager(false); setSelectedCompany(null); }}
      />
    )
  }

  if (showMergeModal && selectedCompany) {
    return (
      <CompanyMergeModal
        sourceCompany={selectedCompany}
        companies={companies}
        onMerge={handleMergeCompanies}
        onCancel={() => { setShowMergeModal(false); setSelectedCompany(null); }}
      />
    )
  }

  if (showMigrationTool) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Company Data Migration
            </h1>
            <p className="text-brand-gray">
              Standardize company data from existing attendee records
            </p>
          </div>
          <button
            onClick={() => setShowMigrationTool(false)}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <CompanyMigrationTool />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Company Management
          </h1>
          <p className="text-brand-gray">
            Manage standardized companies, aliases, and Apax partner assignments
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMigrationTool(true)}
            className="inline-flex items-center px-4 py-2 bg-sector-tech text-white rounded-lg hover:bg-sector-tech/90 font-semibold shadow-sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Data Migration
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">Error loading companies: {error}</p>
          </div>
          <button 
            onClick={refreshCompanies}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-navy">Filters & Search</h3>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="inline-flex items-center text-sm font-semibold text-brand-navy hover:text-brand-navy-light"
          >
            <Filter className="w-4 h-4 mr-1" />
            {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>
        
        <div className={`grid gap-4 transition-all duration-200 ${showAdvancedFilters ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-semibold text-brand-navy">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="sector">Sector</option>
              <option value="geography">Geography</option>
              <option value="aliases">Aliases Count</option>
              <option value="partners">Partners Count</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              <TrendingUp className={`w-4 h-4 text-brand-gray ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showAdvancedFilters && (
            <>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              >
                <option value="all">All Sectors</option>
                <option value="Apax Digital">Apax Digital</option>
                <option value="Services">Services</option>
                <option value="Internet & Consumer">Internet & Consumer</option>
                <option value="Tech">Tech</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Apax">Apax</option>
                <option value="Apax OEP">Apax OEP</option>
                <option value="Impact">Impact</option>
                <option value="Vendors/Sponsors">Vendors/Sponsors</option>
                <option value="Other">Other</option>
              </select>
              
              <select
                value={geographyFilter}
                onChange={(e) => setGeographyFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              >
                <option value="all">All Geographies</option>
                <option value="US">US</option>
                <option value="EU">EU</option>
                <option value="ROW">ROW</option>
                <option value="Global">Global</option>
              </select>
              
              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="parent">Parent Companies</option>
                <option value="subsidiary">Subsidiaries</option>
                <option value="independent">Independent</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Company Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-brand-navy">{stats.total}</div>
          <div className="text-sm text-brand-gray">Total Companies</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.parents}</div>
          <div className="text-sm text-brand-gray">Parent Companies</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.subsidiaries}</div>
          <div className="text-sm text-brand-gray">Subsidiaries</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{stats.totalAliases}</div>
          <div className="text-sm text-brand-gray">Total Aliases</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.totalPartners}</div>
          <div className="text-sm text-brand-gray">Apax Partners</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.companiesWithPartners}</div>
          <div className="text-sm text-brand-gray">With Partners</div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-brand-navy">Quick Actions</h3>
            <div className="flex items-center space-x-2 text-sm text-brand-gray">
              <BarChart3 className="w-4 h-4" />
              <span>Showing {filteredCompanies.length} of {companies.length} companies</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSearchTerm('')
                setSectorFilter('all')
                setGeographyFilter('all')
                setParentFilter('all')
                setSortBy('name')
                setSortOrder('asc')
              }}
              className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Company Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('name')
                        setSortOrder('asc')
                      }
                    }}>
                  <div className="flex items-center space-x-1">
                    <span>Company</span>
                    {sortBy === 'name' && (
                      <TrendingUp className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Geography
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'sector') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('sector')
                        setSortOrder('asc')
                      }
                    }}>
                  <div className="flex items-center space-x-1">
                    <span>Sector / Type</span>
                    {sortBy === 'sector' && (
                      <TrendingUp className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Analytics Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'aliases') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('aliases')
                        setSortOrder('desc')
                      }
                    }}>
                  <div className="flex items-center space-x-1">
                    <span>Aliases</span>
                    {sortBy === 'aliases' && (
                      <TrendingUp className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (sortBy === 'partners') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('partners')
                        setSortOrder('desc')
                      }
                    }}>
                  <div className="flex items-center space-x-1">
                    <span>Apax Partners</span>
                    {sortBy === 'partners' && (
                      <TrendingUp className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Confirmed Attendees
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Partner Names
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Hierarchy
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      {getCompanyIcon(company)}
                      <div>
                        <span className="text-sm font-semibold text-brand-navy">
                          {company.name}
                        </span>
                        {company.website && (
                          <div>
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sector-services hover:underline"
                            >
                              {company.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-10 h-10 object-contain rounded border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center border border-gray-200">
                        <Building className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      {company.geography === 'US' && (
                        <span className="text-lg" title="United States">🇺🇸</span>
                      )}
                      {company.geography === 'EU' && (
                        <span className="text-lg" title="European Union">🇪🇺</span>
                      )}
                      {company.geography === 'ROW' && (
                        <span className="text-lg" title="Rest of World">🌏</span>
                      )}
                      {company.geography === 'Global' && (
                        <span className="text-lg" title="Global">🌍</span>
                      )}
                      <span className="text-sm text-brand-gray">{company.geography}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSectorColor(company.sector)}`}>
                        {company.sector}
                      </span>
                      {company.subsector !== 'Not Applicable' && (
                        <div className="text-xs text-brand-gray">
                          {company.subsector}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.fund_analytics_category === 'Apax Attendees' ? 'bg-purple-100 text-purple-800' :
                      company.fund_analytics_category === 'Buyout Funds' ? 'bg-blue-100 text-blue-800' :
                      company.fund_analytics_category === 'Digital Funds' ? 'bg-indigo-100 text-indigo-800' :
                      company.fund_analytics_category === 'Impact Funds' ? 'bg-green-100 text-green-800' :
                      company.fund_analytics_category === 'Sponsors & Vendors' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {company.fund_analytics_category || 'Other Funds'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { 
                          setSelectedCompany(company); 
                          setShowBulkAliasManager(true); 
                        }}
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-semibold transition-all ${
                          (company.aliases_count || 0) > 0 
                            ? 'text-brand-navy hover:bg-brand-navy hover:text-white' 
                            : 'text-brand-gray hover:text-brand-navy'
                        }`}
                      >
                        <List className="w-4 h-4 mr-1" />
                        {company.aliases_count || 0}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { 
                          setSelectedCompany(company); 
                          setShowApaxPartnerModal(true); 
                        }}
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-semibold transition-all ${
                          (company.apax_partners_count || 0) > 0 
                            ? 'text-brand-navy hover:bg-brand-navy hover:text-white' 
                            : 'text-brand-gray hover:text-brand-navy'
                        }`}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {company.apax_partners_count || 0}/3
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <CompanyAttendeeCount 
                      companyName={company.name}
                      companyId={company.id}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <CompanyPartnerNames companyId={company.id} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      {company.is_parent_company && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          <Crown className="w-3 h-3 mr-1" />
                          Parent Company
                        </span>
                      )}
                      {company.parent_company_name && (
                        <div className="text-xs text-brand-gray mt-1">
                          Subsidiary of: {company.parent_company_name}
                        </div>
                      )}
                      {!company.is_parent_company && !company.parent_company_name && (
                        <span className="text-xs text-brand-gray">Independent</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => { 
                          setSelectedCompany(company); 
                          setShowMergeModal(true); 
                        }}
                        className="p-1 text-brand-gray hover:text-orange-600 rounded hover:bg-orange-50"
                        title="Merge company"
                      >
                        <Merge className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditCompany(company)}
                        className="p-1 text-brand-gray hover:text-brand-navy rounded hover:bg-blue-50"
                        title="Edit company"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="p-1 text-brand-gray hover:text-red-600 rounded hover:bg-red-50"
                        title="Delete company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && !loading && (
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <div>
              <p className="text-brand-gray mb-2">No companies found matching your criteria.</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSectorFilter('all')
                  setGeographyFilter('all')
                  setParentFilter('all')
                }}
                className="text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
              >
                Clear filters to see all companies
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-brand-gray">
        Showing {filteredCompanies.length} of {companies.length} companies • 
        Sorted by {sortBy} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
      </div>
    </div>
  )
}
// Component to display Apax partner names for a company
function CompanyPartnerNames({ companyId }: { companyId: string }) {
  const [partnerNames, setPartnerNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPartnerNames()
  }, [companyId])

  const loadPartnerNames = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('company_apax_partners')
        .select(`
          attendees(
            first_name,
            last_name
          )
        `)
        .eq('standardized_company_id', companyId)

      if (error) throw error

      const names = (data || [])
        .filter(partner => partner.attendees && partner.attendees.first_name && partner.attendees.last_name)
        .map(partner => 
          `${partner.attendees.first_name} ${partner.attendees.last_name}`
        )
      
      setPartnerNames(names)
    } catch (error) {
      console.error('Error loading partner names:', error)
      setPartnerNames([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-brand-gray">
        Loading...
      </div>
    )
  }

  if (partnerNames.length === 0) {
    return (
      <div className="text-xs text-brand-gray">
        No partners assigned
      </div>
    )
  }

  return (
    <div className="text-xs">
      {partnerNames.map((name, index) => (
        <div key={index} className="text-brand-navy font-medium">
          {name}
        </div>
      ))}
    </div>
  )
}