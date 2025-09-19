import React, { useState } from 'react'
import { Plus, Edit, Trash2, Download, Search, Filter, Eye, Users, User, Building, Calendar, MapPin, Upload, FileText, RefreshCw, Database, Award, AlertTriangle } from 'lucide-react'
import { useAttendees, useBreakoutSessions } from '../../hooks/useSupabaseData'
import { useAttendeeStatistics } from '../../hooks/useAttendeeStatistics'
import { supabase, migrateFundAffiliationData, checkFundAffiliationMigrationStatus } from '../../lib/supabase'
import AttendeeForm from './AttendeeForm'
import BulkUpload from './BulkUpload'
import AttendeeBulkExtract from './AttendeeBulkExtract'
import AttendeeImportTool from './AttendeeImportTool'
import SWDayImportTool from './SWDayImportTool'
import IDLoomImportTool from './IDLoomImportTool'
import IDLoomInitialMigration from './IDLoomInitialMigration'
import AttendeeAttributeBadges from './AttendeeAttributeBadges'

// Tooltip component for attribute icons
interface AttributeTooltipProps {
  children: React.ReactNode
  tooltip: string
}

function AttributeTooltip({ children, tooltip }: AttributeTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>
      {showTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {tooltip}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </>
  )
}

interface Attendee {
  id: string
  salutation: string
  firstName: string
  lastName: string
  email: string
  title: string
  company: string
  bio: string
  photo: string
  phone: string
  checkInDate: string
  checkOutDate: string
  hotelSelection: string
  customHotel?: string
  diningSelections: {
    [key: string]: {
      attending: boolean
      tableNumber?: string
    }
  }
  selectedBreakouts: string[]
  registrationStatus: 'confirmed' | 'pending' | 'cancelled'
  accessCode: string
  attributes: {
    apaxIP: boolean
    apaxOEP: boolean
    portfolioCompanyExecutive: boolean
    sponsorAttendee: boolean
    speaker: boolean
    spouse: boolean
    ceo: boolean
    cLevelExec: boolean
    otherAttendeeType: boolean
  }
}

const mockAttendees: Attendee[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@globalindustries.com',
    title: 'Chief Executive Officer',
    company: 'Global Industries Inc.',
    bio: 'John has over 20 years of experience in leading multinational corporations...',
    photo: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
    phone: '+1 (555) 123-4567',
    checkInDate: '2025-03-15',
    checkOutDate: '2025-03-17',
    hotelSelection: 'grand-hotel',
    diningSelections: {
      'welcome-dinner': { attending: true, tableNumber: 'Table 1' },
      'closing-reception': { attending: true },
      'executive-lunch': { attending: false }
    },
    selectedBreakouts: ['digital-transformation', 'leadership-crisis'],
    registrationStatus: 'confirmed',
    accessCode: '123456',
    attributes: {
      apaxIP: true,
      apaxOEP: false,
      portfolioCompanyExecutive: false,
      sponsorAttendee: false,
      speaker: true,
      spouse: false,
      ceo: true,
      cLevelExec: true,
      otherAttendeeType: false
    }
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@innovationlabs.com',
    title: 'Chief Technology Officer',
    company: 'Innovation Labs',
    bio: 'Sarah is a technology visionary with expertise in digital transformation...',
    photo: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400',
    phone: '+1 (555) 987-6543',
    checkInDate: '2025-03-14',
    checkOutDate: '2025-03-18',
    hotelSelection: 'business-center',
    diningSelections: {
      'welcome-dinner': { attending: true, tableNumber: 'Table 2' },
      'closing-reception': { attending: true },
      'executive-lunch': { attending: true, tableNumber: 'Table A' }
    },
    selectedBreakouts: ['digital-transformation'],
    registrationStatus: 'confirmed',
    accessCode: '789012',
    attributes: {
      apaxIP: false,
      apaxOEP: true,
      portfolioCompanyExecutive: false,
      sponsorAttendee: false,
      speaker: false,
      spouse: false,
      ceo: false,
      cLevelExec: true,
      otherAttendeeType: false
    }
  }
]

export default function AttendeeManagement() {
  const { attendees, loading, error, createAttendee, updateAttendee, deleteAttendee, bulkCreateAttendees, refreshAttendees } = useAttendees()
  const { breakoutSessions } = useBreakoutSessions()
  const { statistics, loading: statsLoading, error: statsError, refreshStatistics } = useAttendeeStatistics()
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showBulkExtract, setShowBulkExtract] = useState(false)
  const [showImportTool, setShowImportTool] = useState(false)
  const [showSWDayImportTool, setShowSWDayImportTool] = useState(false)
  const [showIDLoomImportTool, setShowIDLoomImportTool] = useState(false)
  const [showInitialMigration, setShowInitialMigration] = useState(false)
  const [showMigrationPanel, setShowMigrationPanel] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [attendeeTypeFilter, setAttendeeTypeFilter] = useState('all')
  const [roleTypeFilter, setRoleTypeFilter] = useState('all')
  const [fundFamilyFilter, setFundFamilyFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'company'>('name')

  const filteredAttendees = attendees.filter(attendee => {
    const matchesSearch = `${attendee.firstName} ${attendee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attendee.company.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAttendeeType = attendeeTypeFilter === 'all' ||
      (attendeeTypeFilter === 'apax' && (attendee.attributes?.apaxIP || attendee.attributes?.apaxOEP || attendee.attributes?.apaxOther || attendee.is_apax_ep)) ||
      (attendeeTypeFilter === 'portfolio' && attendee.attributes?.portfolioCompanyExecutive) ||
      (attendeeTypeFilter === 'sponsor' && attendee.attributes?.sponsorAttendee) ||
      (attendeeTypeFilter === 'speaker' && attendee.attributes?.speaker) ||
      (attendeeTypeFilter === 'other' && attendee.attributes?.otherAttendeeType)

    const matchesRoleType = roleTypeFilter === 'all' ||
      (roleTypeFilter === 'ceo' && attendee.attributes?.ceo) ||
      (roleTypeFilter === 'cfo' && (attendee.attributes?.cfo || attendee.is_cfo)) ||
      (roleTypeFilter === 'cmo' && attendee.attributes?.cmo) ||
      (roleTypeFilter === 'cro' && attendee.attributes?.cro) ||
      (roleTypeFilter === 'coo' && attendee.attributes?.coo) ||
      (roleTypeFilter === 'chro' && attendee.attributes?.chro) ||
      (roleTypeFilter === 'otherCLevelExec' && attendee.attributes?.otherCLevelExec) ||
      (roleTypeFilter === 'nonCLevelExec' && attendee.attributes?.nonCLevelExec)

    const matchesFundFamily = fundFamilyFilter === 'all' ||
      (fundFamilyFilter === 'buyout' && attendee.attributes?.fundAffiliation === 'buyout') ||
      (fundFamilyFilter === 'digital' && attendee.attributes?.fundAffiliation === 'digital') ||
      (fundFamilyFilter === 'impact' && attendee.attributes?.fundAffiliation === 'impact') ||
      (fundFamilyFilter === 'other' && attendee.attributes?.fundAffiliation === 'other')

    return matchesSearch && matchesAttendeeType && matchesRoleType && matchesFundFamily
  })

  const sortedAttendees = [...filteredAttendees].sort((a, b) => {
    if (sortBy === 'name') {
      const aName = a.lastName || a.last_name || ''
      const bName = b.lastName || b.last_name || ''
      return aName.localeCompare(bName)
    } else {
      const aCompany = a.company_name_standardized || a.company || ''
      const bCompany = b.company_name_standardized || b.company || ''
      return aCompany.localeCompare(bCompany)
    }
  })

  const handleSaveAttendee = async (attendeeData: Partial<Attendee>) => {
    try {
      if (selectedAttendee) {
        await updateAttendee(selectedAttendee.id, attendeeData)
      } else {
        await createAttendee(attendeeData)
      }
      
      setShowForm(false)
      setSelectedAttendee(null)
      refreshStatistics() // Refresh statistics after save
    } catch (error) {
      console.error('Error saving attendee:', error)
      alert('Failed to save attendee. Please try again.')
    }
  }

  const handleDeleteAttendee = async (id: string) => {
    if (confirm('Are you sure you want to delete this attendee?')) {
      try {
        await deleteAttendee(id)
        refreshStatistics() // Refresh statistics after delete
      } catch (error) {
        console.error('Error in delete handler:', error)
        // Error is already handled in the hook, no need to re-throw
      }
    }
  }

  const exportAttendees = () => {
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Title', 'Company', 'Phone', 'Check In', 'Check Out', 'Hotel', 'Status'].join(','),
      ...attendees.map(a => [
        a.firstName, a.lastName, a.email, a.title, a.company, a.phone, 
        a.checkInDate, a.checkOutDate, a.hotelSelection, a.registrationStatus
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendees.csv'
    a.click()
  }

  const handleBulkUpload = async (uploadedAttendees: any[]) => {
    try {
      await bulkCreateAttendees(uploadedAttendees)
      setShowBulkUpload(false)
      refreshStatistics() // Refresh statistics after bulk upload
    } catch (error) {
      console.error('Error bulk uploading attendees:', error)
      alert('Failed to upload attendees. Please try again.')
    }
  }

  const handleBulkExtract = async (extractedAttendees: any[]) => {
    try {
      await bulkCreateAttendees(extractedAttendees)
      setShowBulkExtract(false)
      refreshStatistics() // Refresh statistics after bulk extract
    } catch (error) {
      console.error('Error extracting attendees:', error)
      alert('Failed to extract attendees. Please try again.')
    }
  }

  const handleImportTool = async (importedAttendees: any[]) => {
    try {
      await bulkCreateAttendees(importedAttendees)
      setShowImportTool(false)
      refreshStatistics() // Refresh statistics after import
    } catch (error) {
      console.error('Error importing attendees:', error)
      alert('Failed to import attendees. Please try again.')
    }
  }

  const handleSWDayImport = async (importedAttendees: any[]) => {
    try {
      await bulkCreateAttendees(importedAttendees)
      setShowSWDayImportTool(false)
      refreshStatistics() // Refresh statistics after SW Day import
    } catch (error) {
      console.error('Error importing SW Day attendees:', error)
      alert('Failed to import SW Day attendees. Please try again.')
    }
  }

  const handleIDLoomImport = async (importedAttendees: any[]) => {
    try {
      await bulkCreateAttendees(importedAttendees)
      setShowIDLoomImportTool(false)
      refreshStatistics() // Refresh statistics after IDLoom import
    } catch (error) {
      console.error('Error importing IDLoom attendees:', error)
      alert('Failed to import IDLoom attendees. Please try again.')
    }
  }

  const handleFundAffiliationMigration = async () => {
    if (!confirm('This will standardize all fund affiliation values in the database. Continue?')) {
      return
    }

    setIsMigrating(true)
    try {
      const result = await migrateFundAffiliationData()
      alert(`Migration completed!\n\n${result.message}`)
      await refreshAttendees()
      await checkMigrationStatus()
    } catch (error) {
      console.error('Migration error:', error)
      alert(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsMigrating(false)
    }
  }

  const checkMigrationStatus = async () => {
    try {
      const status = await checkFundAffiliationMigrationStatus()
      setMigrationStatus(status)
    } catch (error) {
      console.error('Error checking migration status:', error)
    }
  }

  // Check migration status on component mount
  React.useEffect(() => {
    checkMigrationStatus()
  }, [])

  if (showBulkUpload) {
    return (
      <BulkUpload
        onUpload={handleBulkUpload}
        onCancel={() => setShowBulkUpload(false)}
      />
    )
  }

  if (showBulkExtract) {
    return (
      <AttendeeBulkExtract
        onExtract={handleBulkExtract}
        onCancel={() => setShowBulkExtract(false)}
      />
    )
  }

  if (showSWDayImportTool) {
    return (
      <SWDayImportTool
        onImport={handleSWDayImport}
        onCancel={() => setShowSWDayImportTool(false)}
      />
    )
  }

  if (showIDLoomImportTool) {
    return (
      <IDLoomImportTool
        onImport={handleIDLoomImport}
        onCancel={() => setShowIDLoomImportTool(false)}
      />
    )
  }

  if (showInitialMigration) {
    return (
      <IDLoomInitialMigration
        onCancel={() => setShowInitialMigration(false)}
      />
    )
  }

  if (showImportTool) {
    return (
      <AttendeeImportTool
        onImport={handleImportTool}
        onCancel={() => setShowImportTool(false)}
      />
    )
  }

  if (showForm) {
    return (
      <AttendeeForm
        attendee={selectedAttendee}
        onSave={handleSaveAttendee}
        onCancel={() => {
          setShowForm(false)
          setSelectedAttendee(null)
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Attendee Management
          </h1>
          <p className="text-brand-gray">
            Manage conference attendees and their registration details
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Temporarily commented out other import tools for testing */}
          {/*
          <button
            onClick={() => setShowSWDayImportTool(true)}
            className="inline-flex items-center px-4 py-2 bg-light-purple text-white rounded-lg hover:bg-light-purple/90 font-semibold shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            SW Day Import Tool
          </button>
          <button
            onClick={() => setShowImportTool(true)}
            className="inline-flex items-center px-4 py-2 bg-sector-tech text-white rounded-lg hover:bg-sector-tech/90 font-semibold shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Base KN Import Tool
          </button>
          <button
            onClick={() => setShowIDLoomImportTool(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            IDLoom Import Tool
          </button>
          */}
          <button
            onClick={() => setShowInitialMigration(true)}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-sm"
          >
            <Database className="w-4 h-4 mr-2" />
            IDLoom Initial Migration
          </button>
          {migrationStatus?.requiresMigration && (
            <button
              onClick={() => setShowMigrationPanel(true)}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold shadow-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Fix Fund Data
            </button>
          )}
          <button
            onClick={() => window.location.href = '/idloom-review'}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            IDLoom Review
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Attendee
          </button>
        </div>
      </div>

      {/* Fund Affiliation Migration Panel */}
      {showMigrationPanel && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Fund Affiliation Data Standardization
              </h3>
              <p className="text-sm text-yellow-700">
                Inconsistent fund affiliation formats detected in your database
              </p>
            </div>
            <button
              onClick={() => setShowMigrationPanel(false)}
              className="p-2 text-yellow-600 hover:text-yellow-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {migrationStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-600">{migrationStatus.needsMigration}</div>
                <div className="text-sm text-yellow-800">Need Standardization</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-green-600">{migrationStatus.alreadyStandardized}</div>
                <div className="text-sm text-green-800">Already Standardized</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-600">{migrationStatus.total}</div>
                <div className="text-sm text-blue-800">Total Records</div>
              </div>
            </div>
          )}

          <div className="bg-white border border-yellow-300 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">What this migration does:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Converts "Fund:buyout" → "buyout"</li>
              <li>• Converts "Fund: Buyout Funds" → "buyout"</li>
              <li>• Standardizes all fund affiliation variants to canonical format</li>
              <li>• Preserves all other attendee attributes unchanged</li>
              <li>• Safe to run multiple times (idempotent)</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={checkMigrationStatus}
              className="inline-flex items-center px-4 py-2 border border-yellow-300 text-yellow-800 rounded-lg hover:bg-yellow-100 font-semibold"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </button>
            <button
              onClick={handleFundAffiliationMigration}
              disabled={isMigrating || !migrationStatus?.requiresMigration}
              className="inline-flex items-center px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Migrating...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Standardize {migrationStatus?.needsMigration || 0} Records
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Attendee Statistics */}
      <div className="mb-6">
        {statsLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
              <span className="ml-3 text-brand-navy">Loading statistics...</span>
            </div>
          </div>
        ) : statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading statistics: {statsError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-brand-navy">{statistics.totalRegistrations}</div>
              <div className="text-sm text-brand-gray">Total Registrations</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.softwareDay}</div>
              <div className="text-sm text-brand-gray">Software Day</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.trackADigital}</div>
              <div className="text-sm text-brand-gray">Track A: Digital</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.trackBCfoOps}</div>
              <div className="text-sm text-brand-gray">Track B: CFO/Ops</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.welcomeDinner}</div>
              <div className="text-sm text-brand-gray">Welcome Dinner</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.mapleAsh}</div>
              <div className="text-sm text-brand-gray">Maple & Ash</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search attendees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-brand-gray" />
                <select
                  value={attendeeTypeFilter}
                  onChange={(e) => setAttendeeTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="all">All Attendee Types</option>
                  <option value="apax">Apax</option>
                  <option value="portfolio">Portfolio Company Exec</option>
                  <option value="sponsor">Sponsors</option>
                  <option value="speaker">Speakers & Presenters</option>
                  <option value="other">Other</option>
                </select>
                
                <select
                  value={roleTypeFilter}
                  onChange={(e) => setRoleTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="all">All Role Types</option>
                  <option value="ceo">CEO</option>
                  <option value="cfo">CFO</option>
                  <option value="cmo">CMO</option>
                  <option value="cro">CRO</option>
                  <option value="coo">COO</option>
                  <option value="chro">CHRO</option>
                  <option value="cto_cio">CTO/CIO</option>
                  <option value="otherCLevelExec">Other C-Level Exec</option>
                  <option value="nonCLevelExec">Non C-Level Exec</option>
                </select>
                
                <select
                  value={fundFamilyFilter}
                  onChange={(e) => setFundFamilyFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="all">All Fund Families</option>
                  <option value="buyout">Buyout Funds</option>
                  <option value="digital">Digital Funds</option>
                  <option value="impact">Impact Funds</option>
                  <option value="other">Other Funds</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'company')}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="name">Sort by Name</option>
                  <option value="company">Sort by Company</option>
                </select>
              </div>
            </div>
            <button
              onClick={exportAttendees}
              className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Attendee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Attributes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Hotel Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAttendees.map((attendee) => (
                <tr key={attendee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                     <div className="flex-shrink-0">
                       <img
                         src={attendee.photo || '/Apax_Favicon_32x32 copy.png'}
                         alt={`${attendee.firstName} ${attendee.lastName}`}
                         className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                         onError={(e) => {
                           e.currentTarget.src = '/Apax_Favicon_32x32 copy.png'
                         }}
                       />
                     </div>
                      <div>
                        <div className="text-sm font-semibold text-brand-navy flex items-center space-x-2">
                          <span>
                          {attendee.salutation && attendee.salutation.trim() ? `${attendee.salutation} ` : ''}{attendee.firstName} {attendee.lastName}
                          </span>
                        </div>
                        <div className="text-xs text-brand-gray">
                          {attendee.title}
                        </div>
                        <div className="text-xs text-brand-gray">
                          {attendee.company_name_standardized && attendee.company_name_standardized !== attendee.company 
                            ? attendee.company_name_standardized 
                            : attendee.company}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AttendeeAttributeBadges attendee={attendee} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-navy">{attendee.email}</div>
                    <div className="text-xs text-brand-gray">{attendee.businessPhone || attendee.mobilePhone}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-navy">
                      {attendee.checkInDate && attendee.checkInDate !== 'Invalid Date' && !isNaN(new Date(attendee.checkInDate).getTime()) ? 
                        new Date(attendee.checkInDate).toLocaleDateString() : 'Not set'}
                    </div>
                    <div className="text-xs text-brand-gray">
                      to {attendee.checkOutDate && attendee.checkOutDate !== 'Invalid Date' && !isNaN(new Date(attendee.checkOutDate).getTime()) ? 
                        new Date(attendee.checkOutDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      attendee.registrationStatus === 'confirmed' 
                        ? 'bg-chart-green/20 text-green-800'
                        : attendee.registrationStatus === 'pending'
                        ? 'bg-sector-tech/20 text-orange-800'
                        : 'bg-chart-red/20 text-red-800'
                    }`}>
                      {attendee.registrationStatus ? attendee.registrationStatus.charAt(0).toUpperCase() + attendee.registrationStatus.slice(1) : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAttendee(attendee)
                          setShowForm(true)
                        }}
                        className="p-1 text-brand-gray hover:text-brand-navy"
                        title="Edit attendee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAttendee(attendee.id)}
                        className="p-1 text-brand-gray hover:text-red-600"
                        title="Delete attendee"
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

        {sortedAttendees.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brand-gray">No attendees found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-brand-gray">
        Showing {sortedAttendees.length} of {attendees.length} attendees
      </div>
    </div>
  )
}