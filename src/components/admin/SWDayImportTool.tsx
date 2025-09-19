import React, { useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle, FileText, User, Mail, Building, Phone, Calendar, MapPin } from 'lucide-react'
import { useDiningOptions, useAttendees, useSponsors } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'

interface SWDayImportToolProps {
  onImport: (attendees: any[]) => void
  onCancel: () => void
}

interface DuplicateMatch {
  importIndex: number
  existingAttendee: any
  matchType: 'email' | 'name' | 'both'
  confidence: 'high' | 'medium' | 'low'
}

// Predefined field mappings based on exact requirements (same as Base KN tool)
const PREDEFINED_MAPPINGS = {
  // Column mapping based on exact requirements
  0: 'salutation',           // Column A - Title/Salutation
  1: 'firstName',            // Column B - First name
  2: 'lastName',             // Column C - Last name  
  3: 'email',                // Column D - Email address
  4: 'title',                // Column E - Professional title
  5: 'businessPhone',        // Column F - Business phone
  6: 'mobilePhone',          // Column G - Mobile phone
  9: 'dietaryRequirements',  // Column J - Dietary requirements
  10: 'hasSpouse',           // Column K - Accompanying Person/Spouse/Partner
  11: 'spouseDetails.salutation',  // Column L - Spouse salutation
  12: 'spouseDetails.firstName',   // Column M - Spouse first name
  13: 'spouseDetails.lastName',    // Column N - Spouse last name
  14: 'spouseDetails.email',       // Column O - Spouse email
  15: 'spouseDetails.mobilePhone', // Column P - Spouse mobile phone
  16: 'spouseDetails.dietaryRequirements', // Column Q - Spouse dietary
  17: 'company',             // Column R - Company name
  18: 'address1',            // Column S - Company Address 1
  19: 'address2',            // Column T - Company Address 2
  20: 'postalCode',          // Column U - Postal Code
  21: 'city',                // Column V - City
  22: 'state',               // Column W - State/Province
  23: 'country',             // Column X - Country
  24: 'countryCode',         // Column Y - Country code
  26: 'registrationId',      // Column AA - Registration ID (read-only)
  54: 'hotelName',           // Column BC - Hotel name
  55: 'roomType',            // Column BD - Room type (ignored)
  56: 'checkInDate',         // Column BE - Check-in date
  57: 'checkOutDate',        // Column BF - Check-out date
  66: 'welcomeReceptionYes', // Column BO - Welcome Reception YES
  68: 'networkingDinnerYes', // Column BQ - Networking Dinner YES
  70: 'breakoutTrackA',      // Column BS - Track A selection
  71: 'swSummitAttending'    // Column BS - SW Summit attendance (SW Day specific)
}

const findDuplicates = (importData: any[], existingData: any[]): DuplicateMatch[] => {
  const duplicates: DuplicateMatch[] = []
  
  // Helper function to normalize names for comparison
  const normalizeName = (name: string): string => {
    return name.toLowerCase()
      .trim()
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
  }
  
  // Helper function to normalize email for comparison
  const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim()
  }
  
  // Helper function to calculate name similarity (Levenshtein-like)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }
  
  // Simple Levenshtein distance implementation
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  
  importData.forEach((importAttendee, index) => {
    existingData.forEach(existingAttendee => {
      // Normalize data for comparison
      const importEmail = normalizeEmail(importAttendee.email || '')
      const existingEmail = normalizeEmail(existingAttendee.email || '')
      
      const importFirstName = normalizeName(importAttendee.firstName || '')
      const existingFirstName = normalizeName(existingAttendee.first_name || existingAttendee.firstName || '')
      
      const importLastName = normalizeName(importAttendee.lastName || '')
      const existingLastName = normalizeName(existingAttendee.last_name || existingAttendee.lastName || '')
      
      const importFullName = `${importFirstName} ${importLastName}`.trim()
      const existingFullName = `${existingFirstName} ${existingLastName}`.trim()
      
      console.log(`Comparing: "${importFullName}" vs "${existingFullName}", emails: "${importEmail}" vs "${existingEmail}"`)
      
      // Email matching (exact match)
      const emailMatch = importEmail && existingEmail && importEmail === existingEmail
      
      // Name matching with multiple strategies
      const exactNameMatch = importFirstName === existingFirstName && importLastName === existingLastName
      
      // Fuzzy name matching (85% similarity threshold)
      const firstNameSimilarity = calculateSimilarity(importFirstName, existingFirstName)
      const lastNameSimilarity = calculateSimilarity(importLastName, existingLastName)
      const fullNameSimilarity = calculateSimilarity(importFullName, existingFullName)
      
      const fuzzyNameMatch = (
        (firstNameSimilarity >= 0.85 && lastNameSimilarity >= 0.85) ||
        fullNameSimilarity >= 0.9
      )
      
      // Check for name variations (nicknames, initials, etc.)
      const firstNameVariations = [
        importFirstName.substring(0, 3), // First 3 characters
        existingFirstName.substring(0, 3)
      ]
      const hasFirstNameVariation = firstNameVariations[0] === firstNameVariations[1] && 
                                   firstNameVariations[0].length >= 3
      
      const nameMatch = exactNameMatch || fuzzyNameMatch || 
                       (hasFirstNameVariation && lastNameSimilarity >= 0.9)
      
      console.log(`Match results - Email: ${emailMatch}, Name: ${nameMatch}, Exact: ${exactNameMatch}, Fuzzy: ${fuzzyNameMatch}`)
      
      if (emailMatch || nameMatch) {
        console.log(`DUPLICATE FOUND: Import "${importFullName}" matches existing "${existingFullName}"`)
        let matchType: 'email' | 'name' | 'both'
        let confidence: 'high' | 'medium' | 'low'
        
        if (emailMatch && (exactNameMatch || fuzzyNameMatch)) {
          matchType = 'both'
          confidence = 'high'
        } else if (emailMatch) {
          matchType = 'email'
          confidence = 'high'
        } else if (exactNameMatch) {
          matchType = 'name'
          confidence = 'high'
        } else if (fuzzyNameMatch || hasFirstNameVariation) {
          matchType = 'name'
          confidence = 'medium'
        } else {
          matchType = 'name'
          confidence = 'low'
        }
        
        duplicates.push({
          importIndex: index,
          existingAttendee,
          matchType,
          confidence
        })
      }
    })
  })
  
  return duplicates
}

export default function SWDayImportTool({ onImport, onCancel }: SWDayImportToolProps) {
  const { sponsors } = useSponsors()
  const { diningOptions } = useDiningOptions()
  const { attendees: existingAttendees } = useAttendees()
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [duplicateResolutions, setDuplicateResolutions] = useState<{[key: number]: 'skip' | 'import' | 'update'}>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [swSummitSessionId, setSWSummitSessionId] = useState<string | null>(null)
  const [excludedAttendees, setExcludedAttendees] = useState<Set<number>>(new Set())
  const [importStats, setImportStats] = useState<{
    totalRows: number
    validRows: number
    withSpouse: number
    apaxEmployees: number
    sponsorAttendees: number
    portfolioCompanyExecs: number
    ceoCount: number
    cLevelCount: number
    welcomeReceptionAttending: number
    networkingDinnerAttending: number
    swSummitAttending: number
    hotelMappings: {
      fourSeasons: number
      parkHyatt: number
      ownArrangements: number
    }
  } | null>(null)

  // Find the SW Summit session ID on component mount
  React.useEffect(() => {
    const findSWSession = async () => {
      try {
        const { data, error } = await supabase
          .from('agenda_items')
          .select('id, title')
          .ilike('title', '%Apax Software CEO Summit%')
          .single()
        
        if (!error && data) {
          setSWSummitSessionId(data.id)
          console.log('Found SW Summit session:', data.id, data.title)
        } else {
          console.warn('SW Summit session not found in database')
        }
      } catch (error) {
        console.error('Error finding SW Summit session:', error)
      }
    }
    
    findSWSession()
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setUploadedFile(file)
    setIsProcessing(true)
    setErrors([])
    setCsvData([])
    setCsvHeaders([])
    setPreviewData([])
    setImportStats(null)
    
    try {
      let headers: string[] = []
      let data: string[][] = []
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Handle CSV files
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          setErrors(['File must contain at least a header row and one data row'])
          setIsProcessing(false)
          return
        }
        
        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.slice(1).map(line => 
          line.split(',').map(cell => cell.trim().replace(/"/g, ''))
        )
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        // Handle Excel files
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length < 2) {
          setErrors(['File must contain at least a header row and one data row'])
          setIsProcessing(false)
          return
        }
        
        headers = jsonData[0].map((h: any) => String(h || '').trim())
        data = jsonData.slice(1).map(row => 
          row.map((cell: any) => String(cell || '').trim())
        )
      } else {
        setErrors(['Please upload a CSV or Excel file (.csv, .xlsx, .xls)'])
        setIsProcessing(false)
        return
      }
      
      if (data.length === 0) {
        setErrors(['File must contain at least one data row'])
        setIsProcessing(false)
        return
      }
      
      setCsvHeaders(headers)
      setCsvData(data)
      
      // Process the data with the SW Day specifications
      processImportData(headers, data)
      
    } catch (error) {
      console.error('File processing error:', error)
      setErrors([`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`])
      setIsProcessing(false)
    }
  }

  const processImportData = (headers: string[], data: string[][]) => {
    try {
      const mappedData = data.map((row, rowIndex) => {
        const attendee: any = {
          salutation: '',
          firstName: '',
          lastName: '',
          email: '',
          title: '',
          bio: '',
          businessPhone: '',
          mobilePhone: '',
          photo: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
          checkInDate: '2025-03-15',
          checkOutDate: '2025-03-17',
          hotelSelection: 'own-arrangements', // Default
          customHotel: '',
          registrationId: '',
          hasSpouse: false,
          spouseDetails: {
            salutation: '',
            firstName: '',
            lastName: '',
            email: '',
            mobilePhone: '',
            dietaryRequirements: ''
          },
          diningSelections: {},
          selectedBreakouts: [],
          registrationStatus: 'confirmed',
          company: '',
          attributes: {
            apaxIP: false,
            apaxOEP: false,
            portfolioCompanyExecutive: false,
            sponsorAttendee: false,
            speaker: false,
            spouse: false,
            ceo: false,
            cLevelExec: false,
            otherAttendeeType: false
          },
          address1: '',
          address2: '',
          postalCode: '',
          city: '',
          state: '',
          country: '',
          countryCode: '',
          roomType: '', // Will be ignored
          assistantName: '',
          assistantEmail: '',
          dietaryRequirements: '',
          accessCode: Math.random().toString().slice(2, 8) // Generate random 6-digit code
        }
        
        // Map columns by index according to requirements (same as Base KN)
        Object.entries(PREDEFINED_MAPPINGS).forEach(([colIndex, fieldPath]) => {
          const index = parseInt(colIndex)
          if (index >= row.length) return
          
          const cellValue = row[index]?.trim() || ''
          
          if (fieldPath.includes('.')) {
            const [parent, child] = fieldPath.split('.')
            if (!attendee[parent]) attendee[parent] = {}
            attendee[parent][child] = cellValue
          } else {
            attendee[fieldPath] = cellValue
          }
        })
        
        // Process special fields (same logic as Base KN)
        
        // Validate email format only if provided
        if (attendee.email && attendee.email.trim() !== '') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
            // Set email to empty string if not provided
            attendee.email = ''
          }
        } else {
          // Set email to empty string if not provided
          attendee.email = ''
        }
        
        // Set hasSpouse based on Column K (index 10)
        const spouseValue = row[10]?.trim().toUpperCase()
        attendee.hasSpouse = spouseValue === 'TRUE' || spouseValue === '1' || spouseValue === 'YES'
        
        // Hotel mapping based on hotel name (same as Base KN)
        const hotelName = row[54]?.trim() || ''
        if (hotelName.toLowerCase().includes('four seasons')) {
          attendee.hotelSelection = 'four-seasons'
        } else if (hotelName.toLowerCase().includes('park hyatt') || hotelName.toLowerCase().includes('hyatt')) {
          attendee.hotelSelection = 'park-hyatt'
        } else if (hotelName) {
          attendee.hotelSelection = 'own-arrangements'
          attendee.customHotel = hotelName
        } else {
          attendee.hotelSelection = 'own-arrangements'
        }
        
        // Process dining selections (same as Base KN)
        const welcomeReceptionYes = row[66] === '1'   // Column BO
        const networkingDinnerYes = row[68] === '1'   // Column BQ
        const swSummitAttending = row[70] === '1'     // Column BS - SW Summit attendance (SW Day specific)
        
        // Map to dining options using legacy keys
        attendee.diningSelections = {
          'welcome-reception-monday': { attending: welcomeReceptionYes },
          'networking-dinner-tuesday': { attending: networkingDinnerYes }
        }
        
        // SW Summit attendance mapping (SW Day Import Tool ONLY)
        // This is the ONLY way attendees can be assigned to the CEO Summit session
        if (swSummitAttending && swSummitSessionId) {
          attendee.selectedBreakouts.push(swSummitSessionId)
          // Add import source tracking to prevent other tools from assigning to this session
          attendee.importSource = 'sw-day-import-tool'
          attendee.swSummitEligible = true
        }
        
        // Attribute detection (same as Base KN)
        
        // 1. Apax employees by email domain
        if (attendee.email.toLowerCase().includes('@apax.com')) {
          attendee.attributes.apaxIP = true
        }
        
        // 2. CEO and C-Level detection by title
        const titleLower = attendee.title.toLowerCase()
        if (titleLower.includes('ceo') || titleLower.includes('chief executive')) {
          attendee.attributes.ceo = true
          attendee.attributes.cLevelExec = true
        } else if (titleLower.includes('cfo') || titleLower.includes('cto') || titleLower.includes('coo') || 
                   titleLower.includes('chief') || titleLower.includes('president')) {
          attendee.attributes.cLevelExec = true
        }
        
        // 3. Sponsor attendee detection by company name
        const isSponsorAttendee = sponsors.some(sponsor => 
          sponsor.name.toLowerCase() === attendee.company.toLowerCase() ||
          attendee.company.toLowerCase().includes(sponsor.name.toLowerCase()) ||
          sponsor.name.toLowerCase().includes(attendee.company.toLowerCase())
        )
        
        if (isSponsorAttendee) {
          attendee.attributes.sponsorAttendee = true
        } else if (!attendee.attributes.apaxIP) {
          // 4. All others (non-Apax, non-sponsor) are portfolio company executives
          attendee.attributes.portfolioCompanyExecutive = true
        }
        
        return attendee
      })
      
      // Filter out invalid rows (missing required fields)
      const validData = mappedData.filter(attendee => {
        // Enhanced validation with better error messages
        const validationErrors = []
        
        if (!attendee.firstName?.trim()) {
          validationErrors.push('Missing first name')
        }
        if (!attendee.lastName?.trim()) {
          validationErrors.push('Missing last name')
        }
        // Email validation - only validate format if email is provided
        if (attendee.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
          validationErrors.push('Invalid email format')
        }
        if (!attendee.title?.trim()) {
          validationErrors.push('Missing title')
        }
        if (!attendee.company?.trim()) {
          validationErrors.push('Missing company')
        }
        
        return validationErrors.length === 0
      })
      
      // Calculate statistics
      const stats = {
        totalRows: data.length,
        validRows: validData.length,
        withSpouse: validData.filter(a => a.hasSpouse).length,
        apaxEmployees: validData.filter(a => a.attributes.apaxIP).length,
        sponsorAttendees: validData.filter(a => a.attributes.sponsorAttendee).length,
        portfolioCompanyExecs: validData.filter(a => a.attributes.portfolioCompanyExecutive).length,
        ceoCount: validData.filter(a => a.attributes.ceo).length,
        cLevelCount: validData.filter(a => a.attributes.cLevelExec).length,
        welcomeReceptionAttending: validData.filter(a => a.diningSelections['welcome-reception-monday']?.attending).length,
        networkingDinnerAttending: validData.filter(a => a.diningSelections['networking-dinner-tuesday']?.attending).length,
        swSummitAttending: validData.filter(a => a.selectedBreakouts.includes(swSummitSessionId)).length,
        hotelMappings: {
          fourSeasons: validData.filter(a => a.hotelSelection === 'four-seasons').length,
          parkHyatt: validData.filter(a => a.hotelSelection === 'park-hyatt').length,
          ownArrangements: validData.filter(a => a.hotelSelection === 'own-arrangements').length
        }
      }
      
      setImportStats(stats)
      setPreviewData(validData)
      
      // Check for duplicates
      console.log('Checking for duplicates...')
      console.log('Import data sample:', validData.slice(0, 2).map(a => ({ firstName: a.firstName, lastName: a.lastName, email: a.email })))
      console.log('Existing attendees raw:', existingAttendees.slice(0, 2))
      
      // Transform existing attendees to match import format
      const transformedExisting = existingAttendees.map(existing => {
        const transformed = {
          firstName: existing.first_name || existing.firstName || '',
          lastName: existing.last_name || existing.lastName || '',
          email: existing.email || '',
          title: existing.title || '',
          company: existing.company || ''
        }
        console.log('Transformed existing attendee:', transformed)
        return transformed
      })
      
      console.log('Transformed existing sample:', transformedExisting.slice(0, 2))
      
      const foundDuplicates = findDuplicates(validData, existingAttendees)
      console.log('Found duplicates:', foundDuplicates)
      setDuplicates(foundDuplicates)
      
      // Initialize duplicate resolutions
      const initialResolutions: {[key: number]: 'skip' | 'import' | 'update'} = {}
      foundDuplicates.forEach(dup => {
        initialResolutions[dup.importIndex] = 'skip' // Default to skip
      })
      setDuplicateResolutions(initialResolutions)
      
      setStep('preview')
      setIsProcessing(false)
      
    } catch (error) {
      console.error('Data processing error:', error)
      setErrors([`Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`])
      setIsProcessing(false)
    }
  }

  // Transform existing attendees to match the format expected by duplicate detection
  const transformExistingAttendee = (existing: any) => ({
    firstName: existing.firstName || existing.first_name || '',
    lastName: existing.lastName || existing.last_name || '',
    email: existing.email || '',
    title: existing.title || '',
    company: existing.company || ''
  })

  const getAttendeeTypeIcon = (attributes: any) => {
    if (!attributes || typeof attributes !== 'object') return 'O'
    
    if (attributes.apaxIP) return 'IP'
    if (attributes.apaxOEP) return 'OEP'
    if (attributes.sponsorAttendee) return 'V'
    if (attributes.portfolioCompanyExecutive) return 'P'
    if (attributes.speaker) return 'S'
    if (attributes.ceo) return 'CEO'
    
    return 'O'
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'IP': return 'bg-brand-navy text-white'
      case 'OEP': return 'bg-sector-services text-white'
      case 'V': return 'bg-sector-tech text-white'
      case 'P': return 'bg-light-purple text-white'
      case 'S': return 'bg-chart-green text-white'
      case 'CEO': return 'bg-sector-consumer text-white'
      default: return 'bg-brand-gray text-white'
    }
  }

  // Helper function to format attribute names properly
  const formatAttributeName = (key: string): string => {
    switch (key) {
      case 'apaxIP': return 'Apax IP'
      case 'apaxOEP': return 'Apax OEP'
      case 'portfolioCompanyExecutive': return 'Portfolio Company Executive'
      case 'sponsorAttendee': return 'Sponsor Attendee'
      case 'speaker': return 'Speaker'
      case 'spouse': return 'Spouse'
      case 'ceo': return 'CEO'
      case 'cLevelExec': return 'C-Level Executive'
      case 'otherAttendeeType': return 'Other Attendee Type'
      default: return key.replace(/([A-Z])/g, ' $1').trim()
    }
  }

  const downloadTemplate = () => {
    // Create a template based on the SW Day structure
    const templateData = [
      // Headers (simplified for template)
      ['Salutation', 'First Name', 'Last Name', 'Email', 'Title', 'Business Phone', 'Mobile Phone', '', '', 'Dietary Requirements', 'Has Spouse', 'Spouse Salutation', 'Spouse First Name', 'Spouse Last Name', 'Spouse Email', 'Spouse Mobile', 'Spouse Dietary', 'Company', 'Address 1', 'Address 2', 'Postal Code', 'City', 'State', 'Country', 'Country Code', '', 'Registration ID', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Hotel Name', 'Room Type', 'Check In Date', 'Check Out Date', '', '', '', '', '', '', '', '', '', '', 'Welcome Reception Yes', '', 'Networking Dinner Yes', '', 'SW Summit Attending'],
      // Sample data
      ['Mr', 'John', 'Smith', 'john.smith@example.com', 'Chief Executive Officer', '555-123-4567', '555-123-4567', '', '', 'Vegetarian', 'FALSE', '', '', '', '', '', '', 'Example Corp', '123 Business St', 'Suite 100', '10001', 'New York', 'NY', 'United States', 'US', '', 'REG123456', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Four Seasons Hotel Chicago', 'Executive Suite', '2025-10-20', '2025-10-22', '', '', '', '', '', '', '', '', '', '', '1', '', '1', '', '1']
    ]
    
    const csvContent = templateData.map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sw_day_import_template.csv'
    a.click()
  }

  const downloadExcelTemplate = () => {
    const templateData = [
      // Headers
      ['Salutation', 'First Name', 'Last Name', 'Email', 'Title', 'Business Phone', 'Mobile Phone', '', '', 'Dietary Requirements', 'Has Spouse', 'Spouse Salutation', 'Spouse First Name', 'Spouse Last Name', 'Spouse Email', 'Spouse Mobile', 'Spouse Dietary', 'Company', 'Address 1', 'Address 2', 'Postal Code', 'City', 'State', 'Country', 'Country Code', '', 'Registration ID', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Hotel Name', 'Room Type', 'Check In Date', 'Check Out Date', '', '', '', '', '', '', '', '', '', '', 'Welcome Reception Yes', '', 'Networking Dinner Yes', '', 'SW Summit Attending'],
      // Sample data
      ['Mr', 'John', 'Smith', 'john.smith@example.com', 'Chief Executive Officer', '555-123-4567', '555-123-4567', '', '', 'Vegetarian', 'FALSE', '', '', '', '', '', '', 'Example Corp', '123 Business St', 'Suite 100', '10001', 'New York', 'NY', 'United States', 'US', '', 'REG123456', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Four Seasons Hotel Chicago', 'Executive Suite', '2025-10-20', '2025-10-22', '', '', '', '', '', '', '', '', '', '', '1', '', '1', '', '1']
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SW Day Attendees')
    XLSX.writeFile(workbook, 'sw_day_import_template.xlsx')
  }

  const handleImport = () => {
    // Filter out skipped duplicates and prepare final import data
    const finalImportData = previewData.filter((_, index) => {
      const resolution = duplicateResolutions[index]
      const isExcluded = excludedAttendees.has(index)
      return resolution !== 'skip' && !isExcluded
    })
    
    if (finalImportData.length > 0) {
      onImport(finalImportData)
    }
  }

  const toggleExcludeAttendee = (index: number) => {
    setExcludedAttendees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const resetTool = () => {
    setStep('upload')
    setUploadedFile(null)
    setCsvData([])
    setCsvHeaders([])
    setPreviewData([])
    setErrors([])
    setImportStats(null)
    setExcludedAttendees(new Set())
  }

  if (step === 'upload') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              SW Day Import Tool
            </h1>
            <p className="text-brand-gray">
              Upload your SW Day CSV or Excel file to import attendee data with Software CEO Summit selections
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-navy">
                Download Templates (Optional)
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV Template
                </button>
                <button
                  onClick={downloadExcelTemplate}
                  className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel Template
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">SW Day Import Specifications:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Hotel Mapping:</strong> Four Seasons → Four Seasons record, Park Hyatt → Park Hyatt record, Blank → Own arrangements</li>
                <li>• <strong>Dining Events:</strong> Welcome Reception (Monday), Networking Dinner (Tuesday)</li>
                <li>• <strong>SW Summit:</strong> Maps to "Apax Software CEO Summit - by invitation only" agenda item</li>
                <li>• <strong>Spouse Counting:</strong> Spouses included in all capacity calculations</li>
                <li>• <strong>Auto-Detection:</strong> Apax employees (@apax.com), CEOs, Sponsors (by company match), Portfolio companies</li>
                <li>• <strong>Access Codes:</strong> Random 6-digit codes generated automatically</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Upload Your SW Day File
            </h3>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-brand-navy bg-brand-navy/5' 
                  : 'border-gray-300 hover:border-brand-navy'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-brand-gray mx-auto mb-4" />
              <p className="text-lg font-semibold text-brand-navy mb-2">
                Drop your SW Day file here
              </p>
              <p className="text-brand-gray mb-4">
                or click to browse and select a file
              </p>
              <p className="text-sm text-brand-gray mb-4">
                Supported formats: CSV, Excel (.xlsx, .xls) • Max size: 10MB
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileInput}
                className="hidden"
                id="sw-day-upload"
              />
              <label
                htmlFor="sw-day-upload"
                className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </label>
            </div>

            {uploadedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-brand-navy" />
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-brand-gray">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {isProcessing && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-navy"></div>
                      <span className="text-sm text-brand-navy font-semibold">Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-600">
                  Processing Errors
                </h3>
              </div>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!swSummitSessionId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">
                    SW Summit Session Not Found
                  </h3>
                  <p className="text-sm text-yellow-800">
                    The "Apax Software CEO Summit - by invitation only" agenda item was not found in the database. 
                    SW Summit selections will be ignored during import.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Preview SW Day Import Data
            </h1>
            <p className="text-brand-gray">
              Review the processed data before importing {previewData.length} attendees
            </p>
          </div>
          <button
            onClick={resetTool}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {importStats && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              SW Day Import Summary
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-brand-navy">{importStats.validRows}</div>
                <div className="text-sm text-brand-gray">Valid Attendees</div>
              </div>
              <div className="bg-light-purple/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-800">{importStats.withSpouse}</div>
                <div className="text-sm text-brand-gray">With Spouse/Partner</div>
              </div>
              <div className="bg-chart-green/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-800">{importStats.welcomeReceptionAttending}</div>
                <div className="text-sm text-brand-gray">Welcome Reception</div>
              </div>
              <div className="bg-sector-services/10 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-800">{importStats.networkingDinnerAttending}</div>
                <div className="text-sm text-brand-gray">Networking Dinner</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-brand-navy/10 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-brand-navy">{importStats.apaxEmployees}</div>
                <div className="text-sm text-brand-gray">Apax Employees</div>
              </div>
              <div className="bg-sector-tech/10 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-orange-800">{importStats.sponsorAttendees}</div>
                <div className="text-sm text-brand-gray">Sponsor Attendees</div>
              </div>
              <div className="bg-sector-consumer/10 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-red-800">{importStats.portfolioCompanyExecs}</div>
                <div className="text-sm text-brand-gray">Portfolio Company Execs</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-800">{importStats.swSummitAttending}</div>
                <div className="text-sm text-brand-gray">SW Summit Attending</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-800">{importStats.ceoCount}</div>
                <div className="text-sm text-brand-gray">CEOs</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-800">{importStats.cLevelCount}</div>
                <div className="text-sm text-brand-gray">C-Level Execs</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-md font-semibold text-brand-navy mb-3">Hotel Mappings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-brand-navy">{importStats.hotelMappings.fourSeasons}</div>
                  <div className="text-sm text-brand-gray">Four Seasons</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-brand-navy">{importStats.hotelMappings.parkHyatt}</div>
                  <div className="text-sm text-brand-gray">Park Hyatt</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-brand-navy">{importStats.hotelMappings.ownArrangements}</div>
                  <div className="text-sm text-brand-gray">Own Arrangements</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-600">
              Ready to Import
            </h3>
          </div>
          <p className="text-sm text-brand-gray mb-4">
            Successfully processed {previewData.length} attendee records with dining selections and SW Summit preferences.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {previewData.slice(0, 5).map((attendee, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${getIconColor(getAttendeeTypeIcon(attendee.attributes))}`}>
                        {getAttendeeTypeIcon(attendee.attributes)}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-brand-navy">
                          {attendee.salutation} {attendee.firstName} {attendee.lastName}
                        </h4>
                        <p className="text-brand-gray text-sm">
                          {attendee.title} at {attendee.company}
                        </p>
                        <p className="text-brand-gray text-xs">
                          Access Code: <code className="font-mono bg-gray-100 px-1 rounded">{attendee.accessCode}</code>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(attendee.attributes).map(([key, value]) => 
                        value && (
                          <span key={key} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {formatAttributeName(key)}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="font-semibold text-brand-navy">Contact:</span>
                      <div className="text-brand-gray">{attendee.email}</div>
                      <div className="text-brand-gray text-xs">
                        {attendee.businessPhone && `Bus: ${attendee.businessPhone}`}
                        {attendee.businessPhone && attendee.mobilePhone && ' | '}
                        {attendee.mobilePhone && `Mob: ${attendee.mobilePhone}`}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-brand-navy">Hotel:</span>
                      <div className="text-brand-gray">
                        {attendee.hotelSelection === 'four-seasons' ? 'Four Seasons' :
                         attendee.hotelSelection === 'park-hyatt' ? 'Park Hyatt' :
                         attendee.customHotel || 'Own arrangements'}
                      </div>
                      <div className="text-brand-gray text-xs">
                        {attendee.checkInDate} to {attendee.checkOutDate}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-brand-navy">Location:</span>
                      <div className="text-brand-gray text-xs">
                        {attendee.city}, {attendee.state}, {attendee.country}
                      </div>
                    </div>
                  </div>
                  
                  {attendee.hasSpouse && (
                    <div className="mb-3 p-3 bg-light-purple/10 rounded">
                      <span className="font-semibold text-brand-navy text-sm">Spouse/Partner:</span>
                      <div className="text-brand-gray text-sm">
                        {attendee.spouseDetails?.salutation} {attendee.spouseDetails?.firstName} {attendee.spouseDetails?.lastName}
                        {attendee.spouseDetails.email && ` (${attendee.spouseDetails.email})`}
                      </div>
                      {attendee.spouseDetails?.dietaryRequirements && (
                        <div className="text-brand-gray text-xs mt-1">
                          Dietary: {attendee.spouseDetails.dietaryRequirements}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {attendee.dietaryRequirements && (
                    <div className="mb-3 p-2 bg-yellow-50 rounded text-sm">
                      <span className="font-semibold text-brand-navy">Dietary Requirements:</span>
                      <div className="text-brand-gray">{attendee.dietaryRequirements}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-brand-navy">Event Selections:</span>
                      <div className="space-y-1 mt-1">
                        {attendee.diningSelections['welcome-reception-monday']?.attending && (
                          <div className="text-green-600 text-xs">✓ Welcome Reception (Monday)</div>
                        )}
                        {attendee.diningSelections['networking-dinner-tuesday']?.attending && (
                          <div className="text-green-600 text-xs">✓ Networking Dinner (Tuesday)</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-brand-navy">Breakout Selections:</span>
                      <div className="space-y-1 mt-1">
                        {attendee.selectedBreakouts.includes('track-a-revenue-growth') && (
                          <div className="text-blue-600 text-xs">✓ Track A: Revenue Growth</div>
                        )}
                        {swSummitSessionId && attendee.selectedBreakouts.includes(swSummitSessionId) && (
                          <div className="text-purple-600 text-xs">✓ Apax Software CEO Summit</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 text-sm mt-3">
                    {attendee.registrationId && (
                      <div>
                        <span className="font-semibold text-brand-navy">Registration:</span>
                        <div className="text-brand-gray text-xs font-mono">
                          {attendee.registrationId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {previewData.length > 5 && (
                <div className="text-center py-4">
                  <p className="text-sm text-brand-gray">
                    ... and {previewData.length - 5} more attendees
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              onClick={resetTool}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Upload Different File
            </button>
            <button
              onClick={handleImport}
              className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
            >
              Import {previewData.filter((_, index) => duplicateResolutions[index] !== 'skip' && !excludedAttendees.has(index)).length} Attendees
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">SW Day Import Processing Details:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Hotel Mapping:</strong> Four Seasons/Park Hyatt mapped to existing records, blank fields → own arrangements</li>
            <li>• <strong>Spouse Counting:</strong> {importStats.withSpouse} spouses will be included in all capacity calculations</li>
            <li>• <strong>Auto-Detection:</strong> {importStats.apaxEmployees} Apax employees, {importStats.sponsorAttendees} sponsor attendees, {importStats.portfolioCompanyExecs} portfolio company executives</li>
            <li>• <strong>Leadership:</strong> {importStats.ceoCount} CEOs, {importStats.cLevelCount} C-level executives identified</li>
            <li>• <strong>SW Summit:</strong> {importStats.swSummitAttending} attendees selected for Apax Software CEO Summit (Column BS = "1")</li>
            <li>• <strong>Access Codes:</strong> Random 6-digit codes generated for all attendees</li>
            <li>• <strong>Room Types:</strong> Ignored as requested (not imported)</li>
          </ul>
        </div>
      </div>
    )
  }

  return null
}