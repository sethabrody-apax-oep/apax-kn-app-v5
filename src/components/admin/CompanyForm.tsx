import React, { useState, useEffect } from 'react'
import { Save, X, Building, Globe, Image, Crown, Users, Upload, User, Mail, Phone } from 'lucide-react'
import { useStandardizedCompanies } from '../../hooks/useCompanyData'
import { supabase } from '../../lib/supabase'
import { EnhancedLogoFetcher } from '../../utils/logoUtils'
import SeatingRequestsSection from './SeatingRequestsSection'

interface CompanyFormProps {
  company?: any
  onSave: (companyData: any) => void
  onCancel: () => void
  onManageApaxPartners?: (company: any) => void
  onManageDomains?: (company: any) => void
}

export default function CompanyForm({ company, onSave, onCancel, onManageApaxPartners, onManageDomains }: CompanyFormProps) {
  const { companies } = useStandardizedCompanies()
  const [isFetchingLogo, setIsFetchingLogo] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    sector: 'Other',
    geography: 'US',
    subsector: 'Software',
    fund_analytics_category: 'Other Funds',
    description: '',
    logo: '',
    website: '',
    is_parent_company: false,
    parent_company_id: null as string | null,
    seating_notes: '',
    priority_networking_attendees: [] as string[]
  })

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        sector: company.sector || 'Other',
        geography: company.geography || 'US',
        subsector: company.subsector || 'Software',
        fund_analytics_category: company.fund_analytics_category || 'Other Funds',
        description: company.description || '',
        logo: company.logo || '',
        website: company.website || '',
        is_parent_company: company.is_parent_company || false,
        parent_company_id: company.parent_company_id || null,
        seating_notes: company.seating_notes || '',
        priority_networking_attendees: company.priority_networking_attendees || []
      })
    }
  }, [company])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (formData.is_parent_company && formData.parent_company_id) {
      alert('A parent company cannot have a parent company')
      return
    }

    onSave(formData)
  }

  const fetchBestLogo = async (website: string): Promise<string> => {
    const result = await EnhancedLogoFetcher.fetchLogoForDomain(website)
    return result.success ? result.url : ''
  }

  const handleWebsiteChange = async (website: string) => {
    // Clean and normalize the website input
    let cleanWebsite = website.trim()
    
    // If user enters a simple domain like "accordion.com", convert to full URL
    if (cleanWebsite && !cleanWebsite.startsWith('http')) {
      // Remove www. if present
      cleanWebsite = cleanWebsite.replace(/^www\./, '')
      // Add https:// prefix
      cleanWebsite = `https://${cleanWebsite}`
    }
    
    setFormData(prev => ({ ...prev, website: cleanWebsite }))
    
    if (cleanWebsite && !formData.logo) {
      setIsFetchingLogo(true)
      try {
        const logoUrl = await fetchBestLogo(cleanWebsite)
        if (logoUrl) {
          setFormData(prev => ({ ...prev, logo: logoUrl }))
        }
      } catch (error) {
        console.error('Error fetching logo:', error)
      } finally {
        setIsFetchingLogo(false)
      }
    }
  }

  const handleRefreshLogo = async () => {
    if (!formData.website) {
      alert('Please enter a website URL first')
      return
    }
    
    setIsFetchingLogo(true)
    try {
      const logoUrl = await fetchBestLogo(formData.website)
      if (logoUrl) {
        setFormData(prev => ({ ...prev, logo: logoUrl }))
      } else {
        alert('Could not find a suitable logo for this website')
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
      alert('Error fetching logo. Please try again.')
    } finally {
      setIsFetchingLogo(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be less than 2MB')
      return
    }

    setIsUploadingLogo(true)

    // Convert to base64 data URL
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setFormData(prev => ({ ...prev, logo: dataUrl }))
      setIsUploadingLogo(false)
    }
    reader.onerror = () => {
      alert('Error reading file. Please try again.')
      setIsUploadingLogo(false)
    }
    reader.readAsDataURL(file)
  }
  // Get potential parent companies (exclude self and current children)
  const potentialParents = companies.filter(c => 
    c.id !== company?.id && // Not self
    !c.parent_company_id && // Not already a subsidiary
    c.is_parent_company // Is marked as parent
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            {company ? 'Edit Company' : 'Add New Company'}
          </h1>
          <p className="text-brand-gray">
            {company ? 'Update company information and relationships' : 'Add a new standardized company'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-brand-gray hover:text-brand-navy"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
                placeholder="Enter the standardized company name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Sector *
              </label>
              <select
                value={formData.sector}
                onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              >
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
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Geography *
              </label>
              <select
                value={formData.geography}
                onChange={(e) => setFormData(prev => ({ ...prev, geography: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              >
                <option value="US">US</option>
                <option value="EU">EU</option>
                <option value="ROW">ROW (Rest of World)</option>
                <option value="Global">Global</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Analytics Category *
              </label>
              <select
                value={formData.fund_analytics_category}
                onChange={(e) => setFormData(prev => ({ ...prev, fund_analytics_category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              >
                <option value="Apax Attendees">Apax Attendees</option>
                <option value="Buyout Funds">Buyout Funds</option>
                <option value="Digital Funds">Digital Funds</option>
                <option value="Impact Funds">Impact Funds</option>
                <option value="Other Funds">Other Funds</option>
                <option value="Sponsors & Vendors">Sponsors & Vendors</option>
              </select>
              <p className="text-xs text-brand-gray mt-1">
                This determines how the company appears in Event Analytics
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Subsector *
              </label>
              <select
                value={formData.subsector}
                onChange={(e) => setFormData(prev => ({ ...prev, subsector: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              >
                <option value="Consumer Goods & Services">Consumer Goods & Services</option>
                <option value="Density Driven Businesses">Density Driven Businesses</option>
                <option value="Healthcare Adjacencies">Healthcare Adjacencies</option>
                <option value="Healthcare Services">Healthcare Services</option>
                <option value="Legacy Media">Legacy Media</option>
                <option value="Medtech">Medtech</option>
                <option value="Online Marketplaces">Online Marketplaces</option>
                <option value="Outsourced Sales and Marketing">Outsourced Sales and Marketing</option>
                <option value="Pharma">Pharma</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Residential Services">Residential Services</option>
                <option value="Software">Software</option>
                <option value="Tech-Enabled Services">Tech-Enabled Services</option>
                <option value="Telecom">Telecom</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Company Overview / Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
                placeholder="Enter a brief overview or description of the company, its business model, key products/services, or other relevant information..."
              />
              <p className="text-xs text-brand-gray mt-1">
                Optional field for additional company context and information
              </p>
            </div>
          </div>
        </div>

        {/* Conference Seating & Business Development Requests */}
        <SeatingRequestsSection
          seatingNotes={formData.seating_notes}
          priorityNetworkingAttendees={formData.priority_networking_attendees}
          companyName={company?.name}
          onSeatingNotesChange={(notes) => setFormData(prev => ({ ...prev, seating_notes: notes }))}
          onPriorityAttendeesChange={(attendeeIds) => setFormData(prev => ({ ...prev, priority_networking_attendees: attendeeIds }))}
          isEditing={true}
        />

        {/* Logo & Website */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Image className="w-5 h-5 mr-2" />
            Logo & Website
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                placeholder="company.com or https://company.com"
              />
              <p className="text-xs text-brand-gray mt-1">
                Enter a simple domain (e.g., accordion.com) or full URL. Logo will be automatically fetched.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Logo URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="Logo URL (auto-filled from website)"
                />
                <button
                  type="button"
                  onClick={handleRefreshLogo}
                  disabled={isFetchingLogo || !formData.website}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-brand-navy rounded-lg hover:bg-gray-200 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingLogo ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-navy"></div>
                  ) : (
                    'Fetch Logo'
                  )}
                </button>
              </div>
            </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={isUploadingLogo}
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold text-sm disabled:opacity-50"
                    >
                      {isUploadingLogo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                <p className="text-xs text-brand-gray">
                  Upload an image file (JPEG, PNG, GIF, WebP, SVG) up to 2MB
                </p>
                    </label>
                  </div>
          </div>

          {formData.logo && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Logo Preview
              </label>
              <img
                src={formData.logo}
                alt="Logo preview"
                className="h-16 w-auto object-contain border border-gray-200 rounded p-2"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/200x80/0e1821/ffffff?text=${encodeURIComponent(formData.name)}`
                }}
              />
            </div>
          )}
        </div>

        {/* Company Hierarchy */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Crown className="w-5 h-5 mr-2" />
            Company Hierarchy
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_parent_company}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      is_parent_company: e.target.checked,
                      parent_company_id: e.target.checked ? null : prev.parent_company_id
                    }))
                  }}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm font-semibold text-brand-navy">
                  This is a parent company
                </span>
              </label>
              <p className="text-xs text-brand-gray mt-1 ml-6">
                Parent companies can have subsidiaries but cannot have a parent themselves
              </p>
            </div>

            {!formData.is_parent_company && (
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Parent Company (Optional)
                </label>
                <select
                  value={formData.parent_company_id || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    parent_company_id: e.target.value || null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="">No parent company (Independent)</option>
                  {companies
                    .filter(c => c.is_parent_company && c.id !== company?.id)
                    .map(parentCompany => (
                      <option key={parentCompany.id} value={parentCompany.id}>
                        {parentCompany.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-brand-gray mt-1">
                  Select if this company is a subsidiary of another company
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Apax Partner Management - Only show in edit mode */}
        {company && onManageApaxPartners && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Apax Partner Management
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Assigned Apax Partners: {company.apax_partners_count || 0}/3
                </p>
                <p className="text-xs text-blue-700">
                  Manage which Apax IP/OEP partners are responsible for this company
                </p>
              </div>
              <button
                type="button"
                onClick={() => onManageApaxPartners(company)}
                className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Partners
              </button>
            </div>
            
            <div className="mt-3 text-xs text-brand-gray">
              <p><strong>Note:</strong> Partner assignments help track which Apax team members are responsible for portfolio companies and relationships.</p>
            </div>
          </div>
        )}

        {/* Registered Attendees - Only show in edit mode */}
        {company && (
          <RegisteredAttendeesList companyName={company.name} />
        )}
        {/* Domain & Logo Management - Only show in edit mode */}
        {company && onManageDomains && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Domain & Logo Management
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-green-900 mb-1">
                  Auto-extract domains from attendee emails and fetch logos
                </p>
                <p className="text-xs text-green-700">
                  Improve logo accuracy by using actual company domains
                </p>
              </div>
              <button
                type="button"
                onClick={() => onManageDomains(company)}
                className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
              >
                <Globe className="w-4 h-4 mr-2" />
                Manage Domains
              </button>
            </div>
            
            <div className="mt-3 text-xs text-brand-gray">
              <p><strong>Note:</strong> Domain extraction analyzes attendee email addresses to find company domains for accurate logo fetching.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {company ? 'Update Company' : 'Save Company'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Component to show registered attendees for a company
function RegisteredAttendeesList({ companyName }: { companyName: string }) {
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadAttendees()
  }, [companyName])

  const loadAttendees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load attendees with either the original company name or standardized company name
      const { data, error: supabaseError } = await supabase
        .from('attendees')
        .select('id, first_name, last_name, email, title, business_phone, mobile_phone, registration_status, attributes, is_spouse, primary_attendee_id')
        .or(`company.eq.${companyName},company_name_standardized.eq.${companyName}`)
        .order('first_name', { ascending: true })

      if (supabaseError) {
        console.error('Error loading company attendees:', supabaseError)
        setError(supabaseError.message)
        setAttendees([])
      } else {
        setAttendees(data || [])
      }
    } catch (err) {
      console.error('Error loading attendees:', err)
      setError('Failed to load attendees')
      setAttendees([])
    } finally {
      setLoading(false)
    }
  }

  const getAttendeeTypeIcon = (attendee: any) => {
    if (attendee.is_spouse) return 'S'
    if (attendee.attributes?.apaxIP) return 'IP'
    if (attendee.attributes?.apaxEP || attendee.is_apax_ep) return 'EP'
    if (attendee.attributes?.apaxOEP) return 'OEP'
    if (attendee.attributes?.ceo) return 'C'
    if (attendee.attributes?.cfo || attendee.is_cfo) return 'F'
    if (attendee.attributes?.sponsorAttendee) return 'V'
    if (attendee.attributes?.portfolioCompanyExecutive) return 'P'
    return 'A'
  }

  const getAttendeeTypeColor = (attendee: any) => {
    if (attendee.is_spouse) return 'bg-purple-500 text-white'
    if (attendee.attributes?.apaxIP) return 'bg-light-purple text-white'
    if (attendee.attributes?.apaxEP || attendee.is_apax_ep) return 'bg-dark-purple text-white'
    if (attendee.attributes?.apaxOEP) return 'bg-chart-green text-white'
    if (attendee.attributes?.ceo) return 'bg-chart-red text-white'
    if (attendee.attributes?.cfo || attendee.is_cfo) return 'bg-blue-600 text-white'
    if (attendee.attributes?.sponsorAttendee) return 'bg-sector-tech text-white'
    if (attendee.attributes?.portfolioCompanyExecutive) return 'bg-sector-services text-white'
    return 'bg-brand-gray text-white'
  }

  const confirmedAttendees = attendees.filter(a => a.registration_status === 'confirmed')
  const displayedAttendees = showAll ? confirmedAttendees : confirmedAttendees.slice(0, 5)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
        <User className="w-5 h-5 mr-2" />
        Registered Attendees ({confirmedAttendees.length})
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-navy"></div>
          <span className="ml-2 text-brand-navy text-sm">Loading attendees...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      ) : confirmedAttendees.length > 0 ? (
        <div>
          <div className="space-y-3">
            {displayedAttendees.map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAttendeeTypeColor(attendee)}`}>
                    {getAttendeeTypeIcon(attendee)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-brand-navy">
                        {attendee.first_name} {attendee.last_name}
                      </span>
                      {attendee.is_spouse && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Spouse
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-brand-gray">
                      {attendee.title}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 text-xs text-brand-gray">
                    {attendee.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{attendee.email}</span>
                      </div>
                    )}
                    {(attendee.business_phone || attendee.mobile_phone) && (
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{attendee.business_phone || attendee.mobile_phone}</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs font-semibold mt-1 ${
                    attendee.registration_status === 'confirmed' ? 'text-green-600' :
                    attendee.registration_status === 'pending' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {attendee.registration_status?.charAt(0).toUpperCase() + attendee.registration_status?.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {confirmedAttendees.length > 5 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-sm font-semibold text-brand-navy hover:text-brand-navy-light"
              >
                {showAll ? 'Show Less' : `Show All ${confirmedAttendees.length} Attendees`}
              </button>
            </div>
          )}
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-brand-navy">
                  {confirmedAttendees.filter(a => !a.is_spouse).length}
                </div>
                <div className="text-brand-gray">Primary Attendees</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {confirmedAttendees.filter(a => a.is_spouse).length}
                </div>
                <div className="text-brand-gray">Spouses/Partners</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {confirmedAttendees.filter(a => a.attributes?.apaxIP || a.attributes?.apaxEP || a.is_apax_ep || a.attributes?.apaxOEP).length}
                </div>
                <div className="text-brand-gray">Apax Personnel</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {confirmedAttendees.filter(a => a.attributes?.ceo || a.attributes?.cfo || a.is_cfo).length}
                </div>
                <div className="text-brand-gray">C-Level Executives</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-brand-gray">
          <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No confirmed attendees registered for this company</p>
        </div>
      )}
    </div>
  )
}