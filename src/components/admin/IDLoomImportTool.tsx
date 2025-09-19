import React, { useState, useEffect } from 'react'
import { Download, Upload, X, AlertCircle, CheckCircle, Database, Eye, RefreshCw, Settings, Users, Building, Mail, Phone, Calendar, MapPin, User } from 'lucide-react'
import { idloomApi, IDLoomApiService, IDLoomGuest, IDLoomEvent } from '../../services/idloomApi'
import { useIDLoomMappings, FieldMapping } from '../../hooks/useIDLoomMappings'
import { useRawIDLoomData } from '../../hooks/useRawIDLoomData'
import { IDLoomTransformationService } from '../../services/idloomTransformationService'
import IDLoomBatchManager from './IDLoomBatchManager'
import SampleDataModal from './SampleDataModal'

interface IDLoomImportToolProps {
  onImport: (attendees: any[]) => void
  onCancel: () => void
}

export default function IDLoomImportTool({ onImport, onCancel }: IDLoomImportToolProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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
    setIsProcessing(true)
    setErrors([])
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setErrors(['File must contain at least a header row and one data row'])
        setIsProcessing(false)
        return
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredHeaders = ['firstname', 'lastname', 'title', 'company']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}`])
        setIsProcessing(false)
        return
      }
      
      const data = []
      const newErrors = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: any = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        // Validate required fields
        if (!row.firstname || !row.lastname || !row.title || !row.company) {
          newErrors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }
        
        // Transform to expected format
        row.firstName = row.firstname
        row.lastName = row.lastname
        row.accessCode = Math.random().toString().slice(2, 8)
        
        data.push(row)
      }
      
      setErrors(newErrors)
      setUploadedData(data)
      
    } catch (error) {
      setErrors(['Error reading file. Please ensure it\'s a valid CSV file.'])
    }
    
    setIsProcessing(false)
  }

  const downloadTemplate = () => {
    const template = [
      'firstname,lastname,email,title,company,phone,checkindate,checkoutdate,hotelselection',
      'John,Smith,john@example.com,CEO,Example Corp,+1234567890,2025-03-15,2025-03-17,grand-hotel',
      'Jane,Doe,jane@example.com,CTO,Tech Inc,+0987654321,2025-03-14,2025-03-18,business-center'
    ].join('\n')
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'idloom_template.csv'
    a.click()
  }

  const handleUpload = () => {
    if (uploadedData.length > 0) {
      onImport(uploadedData)
    }
  }

  const [step, setStep] = useState<'connection' | 'events' | 'analysis' | 'mapping' | 'preview' | 'import'>('connection')
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState<string>('')
  const [events, setEvents] = useState<IDLoomEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<IDLoomEvent | null>(null)
  const [sampleGuests, setSampleGuests] = useState<IDLoomGuest[]>([])
  const [fieldAnalysis, setFieldAnalysis] = useState<any>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [selectedFieldSamples, setSelectedFieldSamples] = useState<{ fieldName: string; samples: any[] }>({ fieldName: '', samples: [] })
  const [showTargetSampleModal, setShowTargetSampleModal] = useState(false)
  const [selectedTargetFieldSamples, setSelectedTargetFieldSamples] = useState<{ fieldName: string; samples: any[] }>({ fieldName: '', samples: [] })
  const [targetFieldSamples, setTargetFieldSamples] = useState<{ [key: string]: any[] }>({})
  const [showBatchManager, setShowBatchManager] = useState(false)

  const { mappings, saveMapping, getMappingByEventUid } = useIDLoomMappings()
  const { bulkInsertRawData, importBatches, refreshImportBatches } = useRawIDLoomData()

  // Load sample data from existing attendees for target fields
  useEffect(() => {
    loadTargetFieldSamples()
  }, [])

  const loadTargetFieldSamples = async () => {
    try {
      // Get a sample of existing attendees to show target field examples
      const { data: sampleAttendees, error } = await supabase
        .from('attendees')
        .select('*')
        .limit(10)

      if (error) {
        console.error('Error loading sample attendees:', error)
        return
      }

      if (!sampleAttendees || sampleAttendees.length === 0) {
        return
      }

      // Organize sample data by field name
      const samples: { [key: string]: any[] } = {}
      const targetFields = getTargetFieldOptions()

      for (const field of targetFields) {
        const fieldName = field.value
        const fieldSamples = sampleAttendees
          .map(attendee => IDLoomTransformationService.getNestedValue(attendee, fieldName))
          .filter(value => value !== undefined && value !== null && value !== '')
          .slice(0, 5) // Limit to 5 samples

        if (fieldSamples.length > 0) {
          samples[fieldName] = fieldSamples
        }
      }

      setTargetFieldSamples(samples)
    } catch (error) {
      console.error('Error loading target field samples:', error)
    }
  }

  // Test IDLoom API connection
  const testConnection = async () => {
    setConnectionStatus('testing')
    setConnectionError('')
    
    try {
      const result = await idloomApi.testConnection()
      
      if (result.success) {
        setConnectionStatus('success')
        setStep('events')
        await loadEvents()
      } else {
        setConnectionStatus('error')
        setConnectionError(result.message || result.error || 'Connection test failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError(error instanceof Error ? error.message : 'Unknown connection error')
    }
  }

  // Load available events from IDLoom
  const loadEvents = async () => {
    setIsLoading(true)
    setLoadingMessage('Loading events from IDLoom...')
    
    try {
      const result = await idloomApi.getEvents(1, 50)
      
      if (result.success && result.data) {
        setEvents(Array.isArray(result.data) ? result.data : [result.data])
      } else {
        throw new Error(result.error || 'Failed to load events')
      }
    } catch (error) {
      console.error('Error loading events:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to load events')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Analyze fields from selected event
  const analyzeEventFields = async (event: IDLoomEvent) => {
    setSelectedEvent(event)
    setIsLoading(true)
    setLoadingMessage('Analyzing attendee data structure...')
    
    try {
      // Load sample guests to analyze field structure
      const result = await idloomApi.getEventGuests(event.uid, 1, 20)
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load sample guests')
      }
      
      const guests = Array.isArray(result.data) ? result.data : [result.data]
      setSampleGuests(guests)
      
      // Fix: Call analyzeCustomFields as a static method on the class
      const analysis = IDLoomApiService.analyzeCustomFields(guests)
      setFieldAnalysis(analysis)
      
      // Check for existing mapping
      const existingMapping = getMappingByEventUid(event.uid)
      if (existingMapping) {
        setFieldMappings(existingMapping.field_mappings)
        setStep('preview')
        generatePreview(guests, existingMapping.field_mappings)
      } else {
        setStep('mapping')
        initializeDefaultMappings(analysis)
      }
      
    } catch (error) {
      console.error('Error analyzing event fields:', error)
      setConnectionError(error instanceof Error ? error.message : 'Failed to analyze event fields')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Initialize default field mappings based on analysis
  const initializeDefaultMappings = (analysis: any) => {
    // Get all available target fields to create default mappings
    const allTargetFields = getTargetFieldOptions()
    const defaultMappings: FieldMapping[] = []
    
    // Define common field mappings
    const commonMappings = [
      { idloomField: 'first_name', targetField: 'firstName', isRequired: true },
      { idloomField: 'firstname', targetField: 'firstName', isRequired: true },
      { idloomField: 'last_name', targetField: 'lastName', isRequired: true },
      { idloomField: 'lastname', targetField: 'lastName', isRequired: true },
      { idloomField: 'email', targetField: 'email', isRequired: true },
      { idloomField: 'title', targetField: 'title', isRequired: true },
      { idloomField: 'job_title', targetField: 'title', isRequired: true },
      { idloomField: 'cpy_name', targetField: 'company', isRequired: true },
      { idloomField: 'company', targetField: 'company', isRequired: true },
      { idloomField: 'phone', targetField: 'businessPhone', isRequired: false },
      { idloomField: 'mobile_phone', targetField: 'mobilePhone', isRequired: false },
      { idloomField: 'bio', targetField: 'bio', isRequired: false },
      { idloomField: 'free_field6', targetField: 'dietaryRequirements', isRequired: false },
      { idloomField: 'free_field2', targetField: 'assistantName', isRequired: false },
      { idloomField: 'email_contact_confirmations', targetField: 'assistant_email', isRequired: false },
      { idloomField: 'arrival', targetField: 'checkInDate', isRequired: false },
      { idloomField: 'departure', targetField: 'checkOutDate', isRequired: false },
      { idloomField: 'hotel', targetField: 'hotelSelection', isRequired: false },
      { idloomField: 'cpy_street', targetField: 'address1', isRequired: false },
      { idloomField: 'cpy_street_number', targetField: 'address2', isRequired: false },
      { idloomField: 'cpy_city', targetField: 'city', isRequired: false },
      { idloomField: 'cpy_state', targetField: 'state', isRequired: false },
      { idloomField: 'cpy_country_name', targetField: 'country', isRequired: false },
      { idloomField: 'cpy_zip_code', targetField: 'postalCode', isRequired: false },
      // Spouse fields
      { idloomField: 'accompanying', targetField: 'hasSpouse', isRequired: false },
      { idloomField: 'accompanying_firstname', targetField: 'spouseDetails.firstName', isRequired: false },
      { idloomField: 'accompanying_lastname', targetField: 'spouseDetails.lastName', isRequired: false },
      { idloomField: 'accompanying_email', targetField: 'spouseDetails.email', isRequired: false },
      { idloomField: 'accompanying_mobile_phone', targetField: 'spouseDetails.mobilePhone', isRequired: false },
      { idloomField: 'accompanying_free_field1', targetField: 'spouse_details.dietaryRequirements', isRequired: false }
    ]
    
    // Add mappings for fields that exist in the analysis
    for (const mapping of commonMappings) {
      if (analysis.fieldNames.includes(mapping.idloomField)) {
        const fieldInfo = {
          ...mapping,
          sampleValue: analysis.sampleValues[mapping.idloomField]?.[0] || '',
          fieldLabel: analysis.fieldLabels[mapping.idloomField] || mapping.idloomField,
          fieldType: analysis.fieldTypes[mapping.idloomField] || 'string'
        }
        defaultMappings.push(fieldInfo)
      }
    }
    
    // Add empty mappings for all remaining target fields that weren't auto-mapped
    const mappedTargetFields = new Set(defaultMappings.map(m => m.targetField))
    for (const targetField of allTargetFields) {
      if (!mappedTargetFields.has(targetField.value)) {
        defaultMappings.push({
          idloomField: '',
          targetField: targetField.value,
          isRequired: targetField.required,
          sampleValue: '',
          fieldLabel: targetField.label,
          fieldType: 'string'
        })
      }
    }
    
    setFieldMappings(defaultMappings)
  }

  // Update field mapping
  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: any) => {
    setFieldMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ))
  }

  // Add new field mapping
  const addFieldMapping = () => {
    setFieldMappings(prev => [...prev, {
      idloomField: '',
      targetField: '',
      isRequired: false,
      sampleValue: '',
      fieldLabel: '',
      fieldType: 'string'
    }])
  }

  // Remove field mapping
  const removeFieldMapping = (index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index))
  }

  // Generate preview of transformed data
  const generatePreview = (guests: IDLoomGuest[], mappings: FieldMapping[]) => {
    const transformedData = guests.slice(0, 5).map(guest => 
      transformIDLoomGuestWithMappings(guest, mappings)
    )
    setPreviewData(transformedData)
  }

  // Transform IDLoom guest data using field mappings
  const transformIDLoomGuestWithMappings = (guest: IDLoomGuest, mappings: FieldMapping[]) => {
    const transformed: any = {
      // Default values
      salutation: '',
      firstName: '',
      lastName: '',
      email: '',
      title: '',
      company: '',
      bio: '',
      photo: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
      businessPhone: '',
      mobilePhone: '',
      dietaryRequirements: '',
      assistantName: '',
      assistantEmail: '',
      checkInDate: '2025-03-15',
      checkOutDate: '2025-03-17',
      hotelSelection: 'grand-hotel',
      customHotel: '',
      registrationId: guest.id || '',
      hasSpouse: false,
      spouseDetails: {},
      diningSelections: {},
      selectedBreakouts: [],
      registrationStatus: 'confirmed',
      accessCode: Math.random().toString().slice(2, 8),
      attributes: {
        apaxIP: false,
        apaxOEP: false,
        portfolioCompanyExecutive: false,
        sponsorAttendee: false,
        speaker: false,
        spouse: false,
        ceo: false,
        cLevelExec: false,
       cmo: false,
        otherAttendeeType: false
      },
      address1: '',
      address2: '',
      postalCode: '',
      city: '',
      state: '',
      country: '',
      countryCode: '',
      roomType: '',
      idloomId: guest.uid || guest.id || ''
    }

    // Apply field mappings
    for (const mapping of mappings) {
      if (!mapping.idloomField || !mapping.targetField) continue
      
      let sourceValue = IDLoomTransformationService.getNestedValue(guest, mapping.idloomField)
      
      if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
        IDLoomTransformationService.setNestedValue(transformed, mapping.targetField, sourceValue)
      }
    }

    // Post-processing for specific fields
    if (transformed.hasSpouse && typeof transformed.hasSpouse === 'string') {
      transformed.hasSpouse = transformed.hasSpouse.toLowerCase() === 'true' || transformed.hasSpouse === '1'
    }

    // Ensure registration status is valid
    if (!['confirmed', 'pending', 'cancelled'].includes(transformed.registrationStatus)) {
      transformed.registrationStatus = 'confirmed'
    }

    return transformed
  }

  // Save field mappings and proceed to preview
  const saveMappingsAndPreview = async () => {
    if (!selectedEvent) return
    
    try {
      await saveMapping(selectedEvent.uid, selectedEvent.name, fieldMappings)
      generatePreview(sampleGuests, fieldMappings)
      setStep('preview')
    } catch (error) {
      console.error('Error saving mappings:', error)
      setConnectionError('Failed to save field mappings')
    }
  }

  // Perform the actual import
  const performRawImport = async () => {
    if (!selectedEvent) return
    
    setIsLoading(true)
    setLoadingMessage('Loading all guests from IDLoom...')
    
    try {
      // Load all guests for the event
      const result = await idloomApi.getAllEventGuests(selectedEvent.uid, 'Complete')
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load all guests')
      }
      
      const allGuests = Array.isArray(result.data) ? result.data : [result.data]
      
      setLoadingMessage('Storing raw data...')
      
      // Store raw data in the database
      const batchId = await bulkInsertRawData(
        selectedEvent.uid,
        selectedEvent.name,
        allGuests
      )
      
      setLoadingMessage('Transforming data using field mappings...')
      
      // Transform the data using field mappings
      const transformedAttendees = allGuests.map(guest => 
        transformIDLoomGuestWithMappings(guest, fieldMappings)
      )
      
      setLoadingMessage('Creating attendee records...')
      
      // Import the transformed attendees directly
      onImport(transformedAttendees)
      
      // Refresh import batches to show the new batch
      await refreshImportBatches()
      
      setLoadingMessage('Import completed successfully!')
      
    } catch (error) {
      console.error('Error importing attendees:', error)
      setConnectionError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  // Show sample data modal
  const showSampleData = (fieldName: string) => {
    const samples = fieldAnalysis?.sampleValues[fieldName] || []
    setSelectedFieldSamples({ fieldName, samples })
    setShowSampleModal(true)
  }

  // Show target field sample data modal
  const showTargetSampleData = (fieldName: string) => {
    const samples = targetFieldSamples[fieldName] || []
    setSelectedTargetFieldSamples({ fieldName, samples })
    setShowTargetSampleModal(true)
  }

  // Get available target fields for mapping
  const getTargetFieldOptions = () => {
    return [
      { value: 'first_name', label: 'first_name (First Name)', required: true },
      { value: 'last_name', label: 'last_name (Last Name)', required: true },
      { value: 'email', label: 'Email', required: true },
      { value: 'title', label: 'title (Job Title)', required: true },
      { value: 'company', label: 'Company', required: true },
      { value: 'salutation', label: 'salutation (Mr/Ms/Dr)', required: false },
      { value: 'bio', label: 'bio (Biography)', required: false },
      { value: 'photo', label: 'photo (Photo URL)', required: false },
      { value: 'business_phone', label: 'business_phone (Business Phone)', required: false },
      { value: 'mobile_phone', label: 'mobile_phone (Mobile Phone)', required: false },
      { value: 'dietaryRequirements', label: 'dietaryRequirements (Dietary Needs)', required: false },
      { value: 'assistantName', label: 'assistantName (Assistant Name)', required: false },
      { value: 'assistantEmail', label: 'assistantEmail (Assistant Email)', required: false },
      { value: 'check_in_date', label: 'check_in_date (Check-in Date)', required: false },
      { value: 'check_out_date', label: 'check_out_date (Check-out Date)', required: false },
      { value: 'hotel_selection', label: 'hotel_selection (Hotel Choice)', required: false },
      { value: 'custom_hotel', label: 'custom_hotel (Custom Hotel Name)', required: false },
      { value: 'registration_id', label: 'registration_id (Registration ID)', required: false },
      { value: 'has_spouse', label: 'has_spouse (Has Spouse - Boolean)', required: false },
      { value: 'spouse_details', label: 'spouse_details (Spouse Info - JSON)', required: false },
      { value: 'spouse_details.dietaryRequirements', label: 'spouse_details.dietaryRequirements (Spouse Dietary Needs)', required: false },
      { value: 'dining_selections', label: 'dining_selections (Dining Choices - JSON)', required: false },
      { value: 'selected_breakouts', label: 'selected_breakouts (Breakout Sessions - Array)', required: false },
      { value: 'registration_status', label: 'registration_status (confirmed/pending/cancelled)', required: false },
      { value: 'access_code', label: 'access_code (6-digit Access Code)', required: false },
      { value: 'attributes', label: 'attributes (Attendee Attributes - JSON)', required: false },
      { value: 'address1', label: 'address1 (Address Line 1)', required: false },
      { value: 'address2', label: 'address2 (Address Line 2)', required: false },
      { value: 'postal_code', label: 'postal_code (ZIP/Postal Code)', required: false },
      { value: 'city', label: 'City', required: false },
      { value: 'state', label: 'State', required: false },
      { value: 'country', label: 'Country', required: false },
      { value: 'country_code', label: 'country_code (Country Code)', required: false },
      { value: 'room_type', label: 'room_type (Room Type)', required: false },
      { value: 'idloom_id', label: 'idloom_id (IDLoom ID)', required: false },
      { value: 'last_synced_at', label: 'last_synced_at (Last Sync Time)', required: false },
      { value: 'is_cfo', label: 'is_cfo (Is CFO - Boolean)', required: false },
      { value: 'is_apax_ep', label: 'is_apax_ep (Is Apax EP - Boolean)', required: false },
      { value: 'primary_attendee_id', label: 'primary_attendee_id (Primary Attendee UUID)', required: false },
      { value: 'is_spouse', label: 'is_spouse (Is Spouse - Boolean)', required: false },
      { value: 'company_name_standardized', label: 'company_name_standardized (Standardized Company)', required: false }
    ]
  }

  // Show batch manager
  if (showBatchManager) {
    return (
      <IDLoomBatchManager
        onClose={() => setShowBatchManager(false)}
      />
    )
  }

  // Connection Step
  if (step === 'connection') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              IDLoom Import Tool
            </h1>
            <p className="text-brand-gray">
              Import attendees directly from IDLoom events
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBatchManager(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              <Database className="w-4 h-4 mr-2" />
              Manage Batches
            </button>
            <button
              onClick={onCancel}
              className="p-2 text-brand-gray hover:text-brand-navy"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <Database className="w-16 h-16 text-brand-navy mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-brand-navy mb-2">
              Connect to IDLoom API
            </h3>
            <p className="text-brand-gray mb-6">
              Test your IDLoom API connection before importing attendee data
            </p>

            {connectionError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 text-sm">{connectionError}</p>
                </div>
              </div>
            )}

            <button
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
              className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectionStatus === 'testing' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Testing Connection...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Test Connection
                </>
              )}
            </button>

            {connectionStatus === 'success' && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 text-sm">Connection successful! Loading events...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Events Step
  if (step === 'events') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Select IDLoom Event
            </h1>
            <p className="text-brand-gray">
              Choose the event to import attendees from
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
              <span className="text-brand-navy font-semibold">{loadingMessage}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {events.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <button
                  key={event.uid}
                  onClick={() => analyzeEventFields(event)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-brand-navy">
                        {event.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-brand-gray mt-1">
                        <span>Event UID: {event.uid}</span>
                        <span>Guests: {event.guest_count || 0}</span>
                        <span>Status: {event.status}</span>
                      </div>
                      {event.start_date && (
                        <div className="text-sm text-brand-gray mt-1">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="text-brand-gray">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-brand-gray">No events found in your IDLoom account.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Analysis Step
  if (step === 'analysis') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Field Analysis: {selectedEvent?.name}
            </h1>
            <p className="text-brand-gray">
              Analyzing available fields from {sampleGuests.length} sample attendees
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {fieldAnalysis && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-brand-navy mb-4">
                Available Fields ({fieldAnalysis.fieldNames.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fieldAnalysis.fieldNames.map((fieldName: string) => (
                  <div key={fieldName} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-brand-navy">
                        {fieldAnalysis.fieldLabels[fieldName] || fieldName}
                      </span>
                      <button
                        onClick={() => showSampleData(fieldName)}
                        className="text-xs text-brand-gray hover:text-brand-navy"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-brand-gray">
                      Type: {fieldAnalysis.fieldTypes[fieldName]} • 
                      Found in: {fieldAnalysis.fieldFrequency[fieldName]}/{sampleGuests.length} records
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep('mapping')}
                  className="btn-primary"
                >
                  Continue to Field Mapping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mapping Step
  if (step === 'mapping') {
    const targetFieldOptions = getTargetFieldOptions()
    
    // Get already selected fields to filter them out of dropdowns
    const selectedIDLoomFields = new Set(fieldMappings.map(m => m.idloomField).filter(f => f))
    const selectedTargetFields = new Set(fieldMappings.map(m => m.targetField).filter(f => f))
    
    // Filter available options
    const availableIDLoomFields = fieldAnalysis?.fieldNames.filter(
      (fieldName: string) => !selectedIDLoomFields.has(fieldName)
    ) || []
    
    const availableTargetFields = targetFieldOptions.filter(
      option => !selectedTargetFields.has(option.value)
    )
    
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Field Mapping: {selectedEvent?.name}
            </h1>
            <p className="text-brand-gray">
              Map IDLoom fields to your attendee database fields
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-navy">
              Field Mappings ({fieldMappings.length})
            </h3>
            <button
              onClick={addFieldMapping}
              className="inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-sm"
            >
              <Settings className="w-4 h-4 mr-1" />
              Add Mapping
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {fieldMappings.map((mapping, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-2">
                      IDLoom Field
                    </label>
                    <select
                      value={mapping.idloomField}
                      onChange={(e) => updateFieldMapping(index, 'idloomField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                    >
                      <option value="">Select IDLoom field...</option>
                      {/* Show currently selected field even if it would be filtered out */}
                      {mapping.idloomField && !availableIDLoomFields.includes(mapping.idloomField) && (
                        <option key={mapping.idloomField} value={mapping.idloomField}>
                          {fieldAnalysis?.fieldLabels[mapping.idloomField] || mapping.idloomField} (selected)
                        </option>
                      )}
                      {availableIDLoomFields.map((fieldName: string) => (
                        <option key={fieldName} value={fieldName}>
                          {fieldAnalysis?.fieldLabels[fieldName] || fieldName}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-2">
                      Target Field
                    </label>
                    <select
                      value={mapping.targetField}
                      onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm"
                    >
                      <option value="">Select target field...</option>
                      {/* Show currently selected field even if it would be filtered out */}
                      {mapping.targetField && !availableTargetFields.find(opt => opt.value === mapping.targetField) && (
                        <option key={mapping.targetField} value={mapping.targetField}>
                          {targetFieldOptions.find(opt => opt.value === mapping.targetField)?.label || mapping.targetField} (selected)
                        </option>
                      )}
                      {availableTargetFields.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} {option.required && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mapping.isRequired}
                      onChange={(e) => updateFieldMapping(index, 'isRequired', e.target.checked)}
                      className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                    />
                    <label className="text-sm text-brand-navy">Required</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {mapping.idloomField && (
                      <button
                        onClick={() => showSampleData(mapping.idloomField)}
                        className="p-2 text-brand-gray hover:text-brand-navy rounded hover:bg-gray-100"
                        title="View sample data"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {mapping.targetField && targetFieldSamples[mapping.targetField] && (
                      <button
                        onClick={() => showTargetSampleData(mapping.targetField)}
                        className="p-2 text-green-600 hover:text-green-800 rounded hover:bg-green-50"
                        title="View target field sample data"
                      >
                        <Database className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => removeFieldMapping(index)}
                      className="p-2 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                      title="Remove mapping"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mapping.sampleValue && (
                    <div className="text-xs text-brand-gray">
                      <span className="font-semibold text-blue-600">IDLoom Sample:</span> {mapping.sampleValue}
                    </div>
                  )}
                  {mapping.targetField && targetFieldSamples[mapping.targetField] && targetFieldSamples[mapping.targetField].length > 0 && (
                    <div className="text-xs text-brand-gray">
                      <span className="font-semibold text-green-600">Database Sample:</span> {
                        typeof targetFieldSamples[mapping.targetField][0] === 'object' 
                          ? JSON.stringify(targetFieldSamples[mapping.targetField][0]).substring(0, 50) + '...'
                          : String(targetFieldSamples[mapping.targetField][0]).substring(0, 50)
                      }
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setStep('events')}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Back to Events
            </button>
            <button
              onClick={saveMappingsAndPreview}
              className="btn-primary"
            >
              Save Mappings & Preview
            </button>
          </div>
        </div>

        {/* Sample Data Modals */}
        {showSampleModal && (
          <SampleDataModal
            fieldName={selectedFieldSamples.fieldName}
            sampleRecords={selectedFieldSamples.samples}
            fieldType={fieldAnalysis?.fieldTypes[selectedFieldSamples.fieldName]}
            fieldCategory={fieldAnalysis?.fieldCategories[selectedFieldSamples.fieldName]}
            modalType="idloom"
            onClose={() => setShowSampleModal(false)}
          />
        )}

        {showTargetSampleModal && (
          <SampleDataModal
            fieldName={selectedTargetFieldSamples.fieldName}
            sampleRecords={selectedTargetFieldSamples.samples}
            modalType="database"
            onClose={() => setShowTargetSampleModal(false)}
          />
        )}
      </div>
    )
  }

  // Preview Step
  if (step === 'preview') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              Import Preview: {selectedEvent?.name}
            </h1>
            <p className="text-brand-gray">
              Review the transformed data before importing
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
          {/* Import Batch History */}
          {importBatches.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-brand-navy mb-4">
                  Recent Import Batches
                </h3>
                <button
                  onClick={() => setShowBatchManager(true)}
                  className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
                >
                  <Database className="w-4 h-4 mr-1" />
                  Manage All Batches
                </button>
              </div>
              <div className="space-y-2">
                {importBatches.slice(0, 3).map((batch) => (
                  <div key={batch.batch_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-semibold text-brand-navy">
                        {batch.event_name}
                      </span>
                      <div className="text-xs text-brand-gray">
                        {batch.total_records} records • {batch.processed_records} processed • 
                        {new Date(batch.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                      batch.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      batch.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Preview Data (First 5 Records)
            </h3>
            
            <div className="space-y-4">
              {previewData.map((attendee, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-brand-navy">
                        {attendee.firstName} {attendee.lastName}
                      </h4>
                      <p className="text-brand-gray text-sm">{attendee.title}</p>
                      <p className="text-brand-gray text-sm">{attendee.company}</p>
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center space-x-2 mb-1">
                        <Mail className="w-4 h-4 text-brand-gray" />
                        <span>{attendee.email}</span>
                      </div>
                      {attendee.businessPhone && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className="w-4 h-4 text-brand-gray" />
                          <span>{attendee.businessPhone}</span>
                        </div>
                      )}
                      {attendee.checkInDate && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-brand-gray" />
                          <span>{attendee.checkInDate} - {attendee.checkOutDate}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      {attendee.hasSpouse && (
                        <div className="bg-purple-50 p-2 rounded">
                          <div className="flex items-center space-x-2 mb-1">
                            <Users className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-purple-800">Has Spouse</span>
                          </div>
                          {attendee.spouseDetails.firstName && (
                            <p className="text-purple-700 text-xs">
                              {attendee.spouseDetails.firstName} {attendee.spouseDetails.lastName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setStep('mapping')}
                className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
              >
                Back to Mapping
              </button>
              <button
                onClick={performRawImport}
                disabled={isLoading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Import All Attendees
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CSV Import fallback
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            IDLoom CSV Import
          </h1>
          <p className="text-brand-gray">
            Import attendees from IDLoom export data
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
              CSV Template
            </h3>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>
          <p className="text-sm text-brand-gray mb-4">
            Download the CSV template for IDLoom data import.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4">
            Upload IDLoom CSV File
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
              Drop your IDLoom CSV file here
            </p>
            <p className="text-brand-gray mb-4">
              or click to browse and select a file
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold"
            >
              Select CSV File
            </label>
          </div>
        </div>

        {isProcessing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
              <span className="text-brand-navy font-semibold">Processing file...</span>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">
                Upload Errors
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

        {uploadedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-600">
                Ready to Import
              </h3>
            </div>
            <p className="text-sm text-brand-gray mb-4">
              Successfully processed {uploadedData.length} IDLoom records.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-brand-navy">Name</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Email</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Title</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedData.slice(0, 10).map((attendee, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-brand-navy">{attendee.firstName} {attendee.lastName}</td>
                      <td className="py-2 text-brand-gray">{attendee.email}</td>
                      <td className="py-2 text-brand-gray">{attendee.title}</td>
                      <td className="py-2 text-brand-gray">{attendee.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadedData.length > 10 && (
                <p className="text-xs text-brand-gray mt-2 text-center">
                  ... and {uploadedData.length - 10} more records
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
              >
                Import {uploadedData.length} Attendees
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}