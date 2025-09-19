import React, { useState } from 'react'
import { BarChart3, Users, Calendar, Utensils, Hotel, MapPin, AlertTriangle, CheckCircle, TrendingUp, Building, Award } from 'lucide-react'
import { useEventAnalyticsData, useSponsorReportData } from '../../hooks/useEventAnalyticsData'
import CompanyAttendeeHoverModal from './CompanyAttendeeHoverModal'
import ApaxAttendeeHoverModal from './ApaxAttendeeHoverModal'
import SponsorReportPDFContent from './SponsorReportPDFContent'

export default function EventAnalytics() {
  const { analyticsData, loading, error, refreshAnalyticsData } = useEventAnalyticsData()
  const { loading: reportLoading, getSponsorReportData } = useSponsorReportData()
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [hoveredCompany, setHoveredCompany] = useState<{
    name: string
    category: 'buyout' | 'digital' | 'impact' | 'sponsors' | 'apax' | 'no-attendees'
    position: { x: number; y: number }
  } | null>(null)
  const [hoveredApaxSubcategory, setHoveredApaxSubcategory] = useState<{
    type: 'ip' | 'ep' | 'oep' | 'other'
    attendees: any[]
    position: { x: number; y: number }
  } | null>(null)

  const handleExportReport = async () => {
    try {
      const data = await getSponsorReportData()
      setReportData(data)
      setShowPrintPreview(true)
    } catch (error) {
      console.error('Error generating sponsor report:', error)
      alert('Failed to generate sponsor report. Please try again.')
    }
  }

  if (showPrintPreview && reportData) {
    return (
      <SponsorReportPDFContent
        reportData={reportData}
        onClose={() => {
          setShowPrintPreview(false)
          setReportData(null)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        <span className="ml-3 text-brand-navy">Loading event analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading analytics: {error}</p>
        <button 
          onClick={refreshAnalyticsData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const getCapacityStatus = (registered: number, capacity: number | null) => {
    if (!capacity) return { status: 'unlimited', color: 'text-gray-600' }
    
    const percentage = (registered / capacity) * 100
    
    if (percentage >= 100) return { status: 'full', color: 'text-red-600' }
    if (percentage >= 90) return { status: 'nearly-full', color: 'text-orange-600' }
    if (percentage >= 75) return { status: 'filling', color: 'text-yellow-600' }
    return { status: 'available', color: 'text-green-600' }
  }

  const getCapacityIcon = (status: string) => {
    switch (status) {
      case 'full': return <AlertTriangle className="w-4 h-4" />
      case 'nearly-full': return <AlertTriangle className="w-4 h-4" />
      case 'filling': return <TrendingUp className="w-4 h-4" />
      case 'available': return <CheckCircle className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Event Analytics
          </h1>
          <p className="text-brand-gray">
            Comprehensive event attendance and capacity analytics
          </p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={reportLoading}
          className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reportLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            'Export Attendee List For Sponsors'
          )}
        </button>
      </div>

      {/* Overall Attendance Statistics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Overall Attendance Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-brand-navy">{analyticsData.totalRegistrations}</div>
            <div className="text-sm text-brand-gray">Total Registrations</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">{analyticsData.totalSpouses}</div>
            <div className="text-sm text-brand-gray">Spouses & Partners</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">{analyticsData.softwareDay}</div>
            <div className="text-sm text-brand-gray">Software Day</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{analyticsData.trackADigital}</div>
            <div className="text-sm text-brand-gray">Track A: Digital</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">{analyticsData.trackBCfoOps}</div>
            <div className="text-sm text-brand-gray">Track B: CFO/Ops</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">{analyticsData.welcomeDinner}</div>
            <div className="text-sm text-brand-gray">Welcome Dinner</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">{analyticsData.mapleAsh}</div>
            <div className="text-sm text-brand-gray">Maple & Ash</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-chart-red">{analyticsData.portfolioCeoCount}</div>
              <div className="text-sm text-brand-gray">Portfolio CEOs</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-blue-600">{analyticsData.portfolioCfoCount}</div>
              <div className="text-sm text-brand-gray">Portfolio CFOs</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-teal-600">{analyticsData.portfolioCooCount}</div>
              <div className="text-sm text-brand-gray">Portfolio COOs</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-cyan-600">{analyticsData.portfolioCioCtoCount}</div>
              <div className="text-sm text-brand-gray">Portfolio CIO/CTOs</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-purple-600">{analyticsData.portfolioCmoCount}</div>
              <div className="text-sm text-brand-gray">Portfolio CMOs</div>
            </div>
        </div>
      </div>

      {/* Attendees by Company Category */}
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-brand-navy mb-6 flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Attendees by Company Category
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Column 1: Apax Attendees */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h3 className="text-md font-semibold text-brand-navy mb-4 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Apax Attendees
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-light-purple rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">IP</span>
                  </div>
                  <span 
                    className="text-sm font-semibold text-brand-navy cursor-pointer hover:text-purple-600"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredApaxSubcategory({
                        type: 'ip',
                        attendees: analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxIPAttendeesList,
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredApaxSubcategory(null)}
                  >
                    Apax IP
                  </span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxIP}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-dark-purple rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">EP</span>
                  </div>
                  <span 
                    className="text-sm font-semibold text-brand-navy cursor-pointer hover:text-purple-600"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredApaxSubcategory({
                        type: 'ep',
                        attendees: analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxEPAttendeesList,
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredApaxSubcategory(null)}
                  >
                    Apax EP
                  </span>
                </div>
                <span className="text-lg font-bold text-purple-800">
                  {analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxEP}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-chart-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">OEP</span>
                  </div>
                  <span 
                    className="text-sm font-semibold text-brand-navy cursor-pointer hover:text-purple-600"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredApaxSubcategory({
                        type: 'oep',
                        attendees: analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxOEPAttendeesList,
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredApaxSubcategory(null)}
                  >
                    Apax OEP
                  </span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxOEP}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-brand-navy rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">A</span>
                  </div>
                  <span 
                    className="text-sm font-semibold text-brand-navy cursor-pointer hover:text-purple-600"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredApaxSubcategory({
                        type: 'other',
                        attendees: analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxOtherAttendeesList,
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredApaxSubcategory(null)}
                  >
                    Other Apax
                  </span>
                </div>
                <span className="text-lg font-bold text-brand-navy">
                  {analyticsData.attendeesByCompanyCategory.apaxAttendees.apaxOther}
                </span>
              </div>
            </div>
            
            {/* Companies with No Attendees Section */}
            <div>
              <h4 className="text-md font-semibold text-brand-navy mb-3 flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Companies with No Attendees ({analyticsData.companiesWithNoAttendees.length})
              </h4>
              <div className="space-y-2">
                {analyticsData.companiesWithNoAttendees.length > 0 ? (
                  analyticsData.companiesWithNoAttendees.map((company, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setHoveredCompany({
                          name: company.companyName,
                          category: 'no-attendees',
                          position: { x: rect.right, y: rect.top + rect.height / 2 }
                        })
                      }}
                      onMouseLeave={() => setHoveredCompany(null)}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.companyName}
                            className="w-6 h-6 object-contain rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                            <Building className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm text-brand-navy truncate" title={company.companyName}>
                          {company.companyName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-600 ml-2">
                        0
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-brand-gray">
                    <Building className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All companies have attendees</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Buyout Funds */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-brand-navy mb-4 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Buyout Funds
            </h3>
            <div className="text-sm text-brand-gray mb-2">
              {analyticsData.attendeesByCompanyCategory.buyoutFunds.length} companies, {analyticsData.attendeesByCompanyCategory.buyoutFunds.reduce((sum, c) => sum + c.attendeeCount, 0)} attendees
            </div>
            <div className="space-y-2">
              {analyticsData.attendeesByCompanyCategory.buyoutFunds.length > 0 ? (
                analyticsData.attendeesByCompanyCategory.buyoutFunds.map((company, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredCompany({
                        name: company.companyName,
                        category: 'buyout',
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredCompany(null)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.companyName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                          <Building className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm text-brand-navy truncate" title={company.companyName}>
                        {company.companyName}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 ml-2">
                      {company.attendeeCount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-brand-gray">
                  <Building className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No buyout fund companies</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Digital Funds */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-brand-navy mb-4 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Digital Funds
            </h3>
            <div className="text-sm text-brand-gray mb-2">
              {analyticsData.attendeesByCompanyCategory.digitalFunds.length} companies, {analyticsData.attendeesByCompanyCategory.digitalFunds.reduce((sum, c) => sum + c.attendeeCount, 0)} attendees
            </div>
            <div className="space-y-2">
              {analyticsData.attendeesByCompanyCategory.digitalFunds.length > 0 ? (
                analyticsData.attendeesByCompanyCategory.digitalFunds.map((company, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredCompany({
                        name: company.companyName,
                        category: 'digital',
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredCompany(null)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.companyName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                          <Building className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm text-brand-navy truncate" title={company.companyName}>
                        {company.companyName}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-purple-600 ml-2">
                      {company.attendeeCount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-brand-gray">
                  <Building className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No digital fund companies</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Impact and Other */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-brand-navy mb-4 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Impact and Other
            </h3>
            <div className="text-sm text-brand-gray mb-2">
              {analyticsData.attendeesByCompanyCategory.impactAndOther.length} companies, {analyticsData.attendeesByCompanyCategory.impactAndOther.reduce((sum, c) => sum + c.attendeeCount, 0)} attendees
            </div>
            <div className="space-y-2">
              {analyticsData.attendeesByCompanyCategory.impactAndOther.length > 0 ? (
                analyticsData.attendeesByCompanyCategory.impactAndOther.map((company, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredCompany({
                        name: company.companyName,
                        category: 'impact',
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredCompany(null)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.companyName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                          <Building className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm text-brand-navy truncate" title={company.companyName}>
                        {company.companyName}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-600 ml-2">
                      {company.attendeeCount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-brand-gray">
                  <Building className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No impact/other companies</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 5: Sponsors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-semibold text-brand-navy mb-4 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Sponsors
            </h3>
            <div className="text-sm text-brand-gray mb-2">
              {analyticsData.attendeesByCompanyCategory.sponsors.length} companies, {analyticsData.attendeesByCompanyCategory.sponsors.reduce((sum, c) => sum + c.attendeeCount, 0)} attendees
            </div>
            <div className="space-y-2">
              {analyticsData.attendeesByCompanyCategory.sponsors.length > 0 ? (
                analyticsData.attendeesByCompanyCategory.sponsors.map((company, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredCompany({
                        name: company.companyName,
                        category: 'sponsors',
                        position: { x: rect.right, y: rect.top + rect.height / 2 }
                      })
                    }}
                    onMouseLeave={() => setHoveredCompany(null)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.companyName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                          <Award className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-sm text-brand-navy truncate" title={company.companyName}>
                        {company.companyName}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-orange-600 ml-2">
                      {company.attendeeCount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-brand-gray">
                  <Award className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sponsor companies</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Seating Events */}
      {analyticsData.assignedSeatingEvents.length > 0 && (
        <div className="mt-12 mb-8">
          <h2 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Assigned Seating Events
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Date & Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Registered / Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analyticsData.assignedSeatingEvents.map((event) => {
                    const capacityStatus = getCapacityStatus(event.registeredCount, event.capacity)
                    
                    return (
                      <tr key={`${event.type}-${event.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-brand-navy">
                            {event.name}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            {event.type === 'agenda' ? (
                              <Calendar className="w-4 h-4 text-brand-navy" />
                            ) : (
                              <Utensils className="w-4 h-4 text-brand-navy" />
                            )}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.type === 'agenda' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {event.type === 'agenda' ? 'Session' : 'Dining'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-brand-gray">
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-brand-gray flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.location}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-brand-navy">
                              {event.registeredCount}
                            </span>
                            <span className="text-sm text-brand-gray">
                              / {event.capacity || '∞'}
                            </span>
                          </div>
                          {event.capacity && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  capacityStatus.status === 'full' ? 'bg-red-500' :
                                  capacityStatus.status === 'nearly-full' ? 'bg-orange-500' :
                                  capacityStatus.status === 'filling' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ 
                                  width: `${Math.min((event.registeredCount / event.capacity) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className={`flex items-center space-x-2 ${capacityStatus.color}`}>
                            {getCapacityIcon(capacityStatus.status)}
                            <span className="text-sm font-medium capitalize">
                              {capacityStatus.status.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Hotel className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-navy">
              Hotel Accommodations
            </h3>
            <p className="text-sm text-brand-gray">
              Conference hotel selections breakdown
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{analyticsData.fourSeasonsCount}</div>
            <div className="text-sm text-brand-gray">Four Seasons Hotel</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{analyticsData.parkHyattCount}</div>
            <div className="text-sm text-brand-gray">Park Hyatt Chicago</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">{analyticsData.makingOwnArrangementsCount}</div>
            <div className="text-sm text-brand-gray">Making Own Arrangements</div>
          </div>
        </div>
      </div>

      {/* Company Attendee Hover Modal */}
      {hoveredCompany && (
        <CompanyAttendeeHoverModal
          companyName={hoveredCompany.name}
          position={hoveredCompany.position}
          isVisible={true}
          fundCategory={hoveredCompany.category}
        />
      )}

      {/* Apax Attendee Hover Modal */}
      {hoveredApaxSubcategory && (
        <ApaxAttendeeHoverModal
          subcategoryType={hoveredApaxSubcategory.type}
          attendees={hoveredApaxSubcategory.attendees}
          position={hoveredApaxSubcategory.position}
          isVisible={true}
        />
      )}

      {/* Analytics Guide */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Event Analytics Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold text-blue-800 mb-3">Attendance Tracking:</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• <strong>Total Registrations:</strong> All confirmed attendees across the event</li>
              <li>• <strong>Breakout Sessions:</strong> Attendees registered for specific tracks</li>
              <li>• <strong>Dining Events:</strong> Meal and reception attendance counts</li>
              <li>• <strong>Real-time Updates:</strong> Statistics refresh automatically with data changes</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold text-blue-800 mb-3">Capacity Management:</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• <strong>Assigned Seating:</strong> Events requiring specific seat assignments</li>
              <li>• <strong>Capacity Monitoring:</strong> Registration vs. maximum capacity tracking</li>
              <li>• <strong>Hotel Distribution:</strong> Accommodation preference analysis</li>
              <li>• <strong>Visual Indicators:</strong> Color-coded status for quick assessment</li>
            </ul>
          </div>
        </div>
      </div>
        </div>
      )}
    </div>
  )
}