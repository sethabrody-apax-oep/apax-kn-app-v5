// IDLoom API Service Layer
// Base URL: https://idloom.events/api/v4
// Documentation: Official OpenAPI 3.1.0 specification

const IDLOOM_BASE_URL = 'https://idloom.events/api'

export interface IDLoomGuest {
  uid: string
  id: string
  profile_uid: string
  event_uid: string
  anonymized_at: string | null
  language: string
  check_ins: number
  first_check_in_at: string | null
  paid_by: string | null
  paying_for: string[]
  comment: string | null
  notes: string | null
  hotel_notes: string | null
  registration_status: string
  coupon: any | null
  category: any
  options: any[]
  hotel: string | null
  amount_tax_incl: number
  amount_tax_excl: number
  amount_tax: number
  payment_status: string
  payment_method: string
  payment_date: string | null
  payment_amount: number
  last_invoice_number: string | null
  last_invoice_date: string | null
  last_invoice_due_date: string | null
  last_proforma_number: string | null
  last_proforma_date: string | null
  last_credit_note_number: string | null
  last_credit_note_date: string | null
  created_at: string
  updated_at: string
  event_name: string
  event_start_date: string | null
  event_end_date: string | null
  // Basic profile fields (these come from the Guest schema but may be in data object)
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  mobile_phone?: string
  job_title?: string
  title?: string
  firstname?: string
  lastname?: string
  cpy_name?: string
  // Company address fields
  cpy_street?: string
  cpy_street_number?: string
  cpy_street_box?: string
  cpy_zip_code?: string
  cpy_city?: string
  cpy_state?: string
  cpy_country?: string
  cpy_vat_number?: string
  // Accompanying person fields
  accompanying?: boolean
  accompanying_title?: string
  accompanying_firstname?: string
  accompanying_lastname?: string
  accompanying_email?: string
  accompanying_mobile_phone?: string
  // Hotel fields
  arrival?: string
  departure?: string
  // Custom fields container
  data?: { [key: string]: any }
}

export interface IDLoomEvent {
  event_uid?: string
  uid: string
  name: string
  description?: string
  start_date: string
  end_date: string
  location?: string
  status: 'draft' | 'published' | 'archived'
  guest_count: number
  created_at: string
  updated_at: string
}

export interface IDLoomApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export class IDLoomApiService {
  private baseUrl: string
  private apiKey: string | null
  private requestQueue: Promise<any> = Promise.resolve()
  private defaultDelayBetweenPagesMs: number = 500

  constructor() {
    this.baseUrl = IDLOOM_BASE_URL
    this.apiKey = import.meta.env.VITE_IDLOOM_API_KEY || null
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0
  }

  // Get configuration status
  getConfigurationStatus(): { configured: boolean; error?: string } {
    if (!this.apiKey) {
      return {
        configured: false,
        error: 'VITE_IDLOOM_API_KEY environment variable is not set. Please add it to your .env file.'
      }
    }
    
    if (this.apiKey.trim().length === 0) {
      return {
        configured: false,
        error: 'VITE_IDLOOM_API_KEY is empty. Please provide a valid API key.'
      }
    }
    
    return { configured: true }
  }

  // Generic API request method with error handling
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    attempt: number = 0,
    maxRetries: number = 3
  ): Promise<IDLoomApiResponse<T>> {
    // Queue requests to prevent concurrent API calls
    return this.requestQueue = this.requestQueue.then(async () => {
      return this.executeRequest<T>(endpoint, options, attempt, maxRetries)
    })
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    attempt: number = 0,
    maxRetries: number = 3
  ): Promise<IDLoomApiResponse<T>> {
    // Check if API key is configured before making request
    if (!this.isConfigured()) {
      const configStatus = this.getConfigurationStatus()
      return {
        success: false,
        error: 'API not configured',
        message: configStatus.error || 'IDLoom API key is not configured'
      }
    }

    try {
      // Use the correct API version path
      const url = `${this.baseUrl}/v4${endpoint}`
      
      console.log(`IDLoom API Request (attempt ${attempt + 1}):`, {
        url,
        method: options.method || 'GET',
        headers: options.headers,
        hasApiKey: !!this.apiKey
      })
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey!}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        // Handle 429 rate limit errors with retry mechanism
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after')
          
          if (attempt < maxRetries) {
            // Use Retry-After header if present, otherwise exponential backoff with jitter
            const baseDelay = retryAfter 
              ? Number(retryAfter) * 1000 
              : Math.min(32000, 1000 * Math.pow(2, attempt))
            const jitter = Math.floor(Math.random() * 250)
            const delay = baseDelay + jitter
            
            console.log(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return this.executeRequest<T>(endpoint, options, attempt + 1, maxRetries)
          } else {
            console.error(`Max retries (${maxRetries}) exceeded for rate limit`)
          }
        }
        
        // Handle 401/403 authentication errors
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: 'Authentication failed',
            message: 'Invalid API key or insufficient permissions. Please check your IDLoom API credentials.'
          }
        }
        
        // Handle 500 server errors with retry
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.min(10000, 1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 1000)
          console.log(`Server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.executeRequest<T>(endpoint, options, attempt + 1, maxRetries)
        }
        
        // Handle different error response types
        const contentType = response.headers.get('content-type') || ''
        let errorMessage: string
        
        if (response.status === 404 && contentType.includes('text/html')) {
          // For 404 HTML responses, provide a concise message instead of full HTML
          errorMessage = `Endpoint not found: ${endpoint}`
        } else {
          const errorText = await response.text()
          errorMessage = errorText
        }
        
        return {
          success: false,
          error: `API Error ${response.status}: ${response.statusText}`,
          message: errorMessage,
          statusCode: response.status
        }
      }

      const data = await response.json()
      
      // Debug logging for IDLoom API responses
      console.log('IDLoom API Response Data:', {
        endpoint,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        rawData: data,
        dataType: typeof data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A'
      })
      
      return {
        success: true,
        data: data.data || data, // Handle different response formats
        pagination: data.meta || data.pagination // Handle both meta and pagination formats
      }
    } catch (error) {
      console.error('IDLoom API Request Error:', error)
      
      // Handle network errors with retry
      if (error instanceof TypeError && error.message.includes('fetch') && attempt < maxRetries) {
        const delay = Math.min(5000, 1000 * Math.pow(2, attempt))
        console.log(`Network error. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.executeRequest<T>(endpoint, options, attempt + 1, maxRetries)
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
        message: 'Network connection failed or request timeout'
      }
    }
  }

  // Test API connection
  async testConnection(): Promise<IDLoomApiResponse<any>> {
    console.log('Testing IDLoom API connection...')
    
    // Check configuration first
    const configStatus = this.getConfigurationStatus()
    if (!configStatus.configured) {
      return {
        success: false,
        error: 'Configuration Error',
        message: configStatus.error || 'API not properly configured'
      }
    }
    
    // Use the auth endpoint for testing as it's specifically designed for credential validation
    const authTest = await this.makeRequest('/other/auth')
    return authTest
  }

  // Get all events
  async getEvents(page: number = 1, perPage: number = 50): Promise<IDLoomApiResponse<IDLoomEvent[]>> {
    console.log(`Fetching IDLoom events (page ${page}, ${perPage} per page)...`)
    return this.makeRequest(`/events?page=${page}&page_size=${perPage}`)
  }

  // Get specific event by UID
  async getEvent(eventUid: string): Promise<IDLoomApiResponse<IDLoomEvent>> {
    console.log(`Fetching IDLoom event: ${eventUid}`)
    return this.makeRequest(`/events?uid=${eventUid}`)
  }

  // Get all guests for an event
  async getEventGuests(
    event_uid: string, 
    page: number = 1, 
    page_size: number = 100,
    ignore_fields_mapping: boolean = true
  ): Promise<IDLoomApiResponse<IDLoomGuest[]>> {
    console.log(`Fetching guests for event ${event_uid} (page ${page}, ${page_size} per page)...`)
    console.log('Event UID details:', {
      event_uid,
      type: typeof event_uid,
      length: event_uid?.length,
      encoded: encodeURIComponent(event_uid)
    })
    
    let endpoint = `/attendees?event_uid=${encodeURIComponent(event_uid)}&page=${page}&page_size=${page_size}&ignore_fields_mapping=${ignore_fields_mapping ? 1 : 0}`
    
    console.log('Full guest endpoint URL:', endpoint)
    
    return this.makeRequest(endpoint)
  }

  // Get all guests for an event (with pagination handling)
  async getAllEventGuests(
    event_uid: string, 
    registration_status: string = 'Complete',
    since?: string, // ISO date string for incremental sync
    onProgress?: (current: number, total: number) => void
  ): Promise<IDLoomApiResponse<IDLoomGuest[]>> {
    console.log(`Fetching ALL guests for event ${event_uid}...`)
    if (since) {
      console.log(`Incremental sync: fetching guests updated since ${since}`)
    }
    
    const allGuests: IDLoomGuest[] = []
    let page = 1
    let totalPages = 1
    let hasMorePages = true
    
    while (hasMorePages && page <= 50) { // Safety limit of 50 pages
      const response = await this.getEventGuests(event_uid, page, 100, true)
      
      if (!response.success) {
        console.error(`Failed to fetch page ${page}:`, response.error)
        return response
      }
      
      if (response.data) {
        // Apply client-side filtering for registration_status if specified
        let filteredData = registration_status
          ? response.data.filter(guest => guest.registration_status === registration_status)
          : response.data
        // Filter by update date for incremental sync
        if (since) {
          const sinceDate = new Date(since)
          filteredData = filteredData.filter(guest => 
            guest.updated_at && new Date(guest.updated_at) > sinceDate
          )
        }
        
        allGuests.push(...filteredData)
        
        console.log(`Page ${page}: Found ${response.data.length} guests, ${filteredData.length} matching criteria`)
      }
      
      if (response.pagination) {
        totalPages = response.pagination.last_page || response.pagination.total_pages || 1
        hasMorePages = page < totalPages && response.data && response.data.length > 0
        
        if (onProgress) {
          onProgress(page, totalPages)
        }
      } else {
        // No pagination info means this is the last page
        hasMorePages = false
      }
      
      // Add delay between page requests to avoid rate limiting
      if (hasMorePages) {
        await new Promise(resolve => setTimeout(resolve, this.defaultDelayBetweenPagesMs))
      }
      
      page++
    }
    
    console.log(`Successfully fetched ${allGuests.length} guests from ${totalPages} pages`)
    
    return {
      success: true,
      data: allGuests
    }
  }

  // Get specific guest by UID
  async getGuest(guestUid: string): Promise<IDLoomApiResponse<IDLoomGuest>> {
    console.log(`Fetching IDLoom guest with UID: ${guestUid}`)
    return this.makeRequest(`/attendees?guest_uid=${encodeURIComponent(guestUid)}&ignore_fields_mapping=1`)
  }

  // Get guests by multiple UIDs
  async getGuestsByUids(guestUids: string[]): Promise<IDLoomApiResponse<IDLoomGuest[]>> {
    console.log(`Fetching ${guestUids.length} guests by UIDs...`)
    
    // IDLoom might support batch requests, but if not, we'll make individual requests
    const guests: IDLoomGuest[] = []
    const errors: string[] = []
    
    for (const uid of guestUids) {
      const response = await this.getGuest(uid)
      if (response.success && response.data) {
        guests.push(response.data)
      } else {
        errors.push(`Failed to fetch guest ${uid}: ${response.error}`)
      }
    }
    
    if (errors.length > 0) {
      console.warn('Some guests could not be fetched:', errors)
    }
    
    return {
      success: true,
      data: guests
    }
  }

  // Search guests across events
  async searchGuests(
    query: string, 
    eventUid?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<IDLoomApiResponse<IDLoomGuest[]>> {
    console.log(`Searching IDLoom guests: "${query}"`)
    
    let endpoint = `/attendees?page=${page}&page_size=${pageSize}&ignore_fields_mapping=1`
    if (eventUid) {
      endpoint += `&event_uid=${encodeURIComponent(eventUid)}`
    }
    // Note: The API documentation doesn't show a search endpoint, so we'll filter client-side
    
    return this.makeRequest(endpoint)
  }

  // Get all fields definition for an event (to understand the data structure)
  async getEventFields(eventUid: string): Promise<IDLoomApiResponse<any[]>> {
    console.log(`Fetching event fields for event: ${eventUid}`)
    return this.makeRequest(`/events/fields?event_uid=${encodeURIComponent(eventUid)}`)
  }

  // Get all categories for an event
  async getEventCategories(eventUid: string): Promise<IDLoomApiResponse<any[]>> {
    console.log(`Fetching event categories for event: ${eventUid}`)
    return this.makeRequest(`/events/categories?event_uid=${encodeURIComponent(eventUid)}`)
  }

  // Get all options for an event
  async getEventOptions(eventUid: string): Promise<IDLoomApiResponse<any[]>> {
    console.log(`Fetching event options for event: ${eventUid}`)
    return this.makeRequest(`/events/options?event_uid=${encodeURIComponent(eventUid)}`)
  }

  // Get all attendee statuses for an event
  async getEventAttendeeStatuses(eventUid: string): Promise<IDLoomApiResponse<string[]>> {
    console.log(`Fetching attendee statuses for event: ${eventUid}`)
    return this.makeRequest(`/events/attendees-statuses?event_uid=${encodeURIComponent(eventUid)}`)
  }

  // Utility method to extract and analyze custom fields from guest data
  static analyzeCustomFields(guests: IDLoomGuest[]): {
    fieldNames: string[]
    fieldFrequency: { [key: string]: number }
    sampleValues: { [key: string]: any[] }
    fieldTypes: { [key: string]: string }
    nestedFields: { [key: string]: string[] }
    fieldLabels: { [key: string]: string }
    fieldCategories: { [key: string]: string }
  } {
    const fieldNames = new Set<string>()
    const fieldFrequency: { [key: string]: number } = {}
    const sampleValues: { [key: string]: any[] } = {}
    const fieldTypes: { [key: string]: string } = {}
    const nestedFields: { [key: string]: string[] } = {}
    const fieldLabels: { [key: string]: string } = {}
    const fieldCategories: { [key: string]: string } = {}
    
    guests.forEach(guest => {
      // Process ALL top-level fields from the guest object
      Object.keys(guest).forEach(fieldName => {
        const fieldValue = guest[fieldName]
        
        // Skip null, undefined, empty objects, and empty arrays
        if (fieldValue !== undefined && 
            fieldValue !== null && 
            fieldValue !== '' &&
            !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
            !(typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)) {
          
          fieldNames.add(fieldName)
          fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1
          
          // Set field category and label
          if (!fieldCategories[fieldName]) {
            fieldCategories[fieldName] = this.categorizeField(fieldName)
            fieldLabels[fieldName] = this.generateFieldLabel(fieldName)
          }
          
          // Determine field type
          if (!fieldTypes[fieldName]) {
            if (Array.isArray(fieldValue)) {
              fieldTypes[fieldName] = 'array'
            } else if (typeof fieldValue === 'object') {
              fieldTypes[fieldName] = 'object'
              // Analyze nested object fields
              if (!nestedFields[fieldName]) {
                nestedFields[fieldName] = []
              }
              Object.keys(fieldValue).forEach(nestedKey => {
                if (!nestedFields[fieldName].includes(nestedKey)) {
                  nestedFields[fieldName].push(nestedKey)
                }
              })
            } else if (typeof fieldValue === 'boolean') {
              fieldTypes[fieldName] = 'boolean'
            } else if (typeof fieldValue === 'number') {
              fieldTypes[fieldName] = 'number'
            } else if (typeof fieldValue === 'string') {
              // Enhanced string type detection
              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fieldValue)) {
                fieldTypes[fieldName] = 'datetime'
              } else if (/^\d{4}-\d{2}-\d{2}/.test(fieldValue)) {
                fieldTypes[fieldName] = 'date'
              } else if (/^\d{2}:\d{2}/.test(fieldValue)) {
                fieldTypes[fieldName] = 'time'
              } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
                fieldTypes[fieldName] = 'email'
              } else if (/^\+?[\d\s\-\(\)\.]{7,}$/.test(fieldValue)) {
                fieldTypes[fieldName] = 'phone'
              } else if (/^https?:\/\//.test(fieldValue)) {
                fieldTypes[fieldName] = 'url'
              } else {
                fieldTypes[fieldName] = 'string'
              }
            } else {
              fieldTypes[fieldName] = typeof fieldValue
            }
          }
          
          if (!sampleValues[fieldName]) {
            sampleValues[fieldName] = []
          }
          
          // Store sample values (convert to string for consistency)
          if (sampleValues[fieldName].length < 5) {
            const sampleValue = typeof fieldValue === 'object' ? 
              JSON.stringify(fieldValue) : 
              String(fieldValue)
            sampleValues[fieldName].push(sampleValue)
          }
        }
      })
      
      // Process custom fields from guest.data
      if (guest.data && typeof guest.data === 'object' && Object.keys(guest.data).length > 0) {
        Object.keys(guest.data).forEach(fieldName => {
          const fieldValue = guest.data[fieldName]
          
          // Skip null, undefined, and empty values
          if (fieldValue !== undefined && 
              fieldValue !== null && 
              fieldValue !== '' &&
              !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
              !(typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)) {
            
            // Prefix custom fields to distinguish them
            const customFieldName = `data.${fieldName}`
            fieldNames.add(customFieldName)
            fieldFrequency[customFieldName] = (fieldFrequency[customFieldName] || 0) + 1
            
            // Set field category and label for custom fields
            if (!fieldCategories[customFieldName]) {
              fieldCategories[customFieldName] = 'custom'
              fieldLabels[customFieldName] = this.generateFieldLabel(fieldName)
            }
            
            // Determine field type for custom fields
            if (!fieldTypes[customFieldName]) {
              if (Array.isArray(fieldValue)) {
                fieldTypes[customFieldName] = 'array'
              } else if (typeof fieldValue === 'object') {
                fieldTypes[customFieldName] = 'object'
              } else if (typeof fieldValue === 'boolean') {
                fieldTypes[customFieldName] = 'boolean'
              } else if (typeof fieldValue === 'number') {
                fieldTypes[customFieldName] = 'number'
              } else if (typeof fieldValue === 'string') {
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'datetime'
                } else if (/^\d{4}-\d{2}-\d{2}/.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'date'
                } else if (/^\d{2}:\d{2}/.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'time'
                } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'email'
                } else if (/^\+?[\d\s\-\(\)\.]{7,}$/.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'phone'
                } else if (/^https?:\/\//.test(fieldValue)) {
                  fieldTypes[customFieldName] = 'url'
                } else {
                  fieldTypes[customFieldName] = 'string'
                }
              } else {
                fieldTypes[customFieldName] = typeof fieldValue
              }
            }
            
            if (!sampleValues[customFieldName]) {
              sampleValues[customFieldName] = []
            }
            
            // Store sample values (convert to string for consistency)
            if (sampleValues[customFieldName].length < 5) {
              const sampleValue = typeof fieldValue === 'object' ? 
                JSON.stringify(fieldValue) : 
                String(fieldValue)
              sampleValues[customFieldName].push(sampleValue)
            }
          }
        })
      }
    })
    
    return {
      fieldNames: Array.from(fieldNames).sort(),
      fieldFrequency,
      sampleValues,
      fieldTypes,
      nestedFields,
      fieldLabels,
      fieldCategories
    }
  }

  // Categorize fields for better organization in the UI
  private static categorizeField(fieldName: string): string {
    const personalFields = ['first_name', 'last_name', 'firstname', 'lastname', 'email', 'phone', 'mobile_phone', 'title', 'job_title']
    const companyFields = ['cpy_name', 'cpy_street', 'cpy_city', 'cpy_country', 'cpy_zip_code', 'cpy_state', 'cpy_vat_number']
    const eventFields = ['registration_status', 'category', 'options', 'hotel', 'arrival', 'departure']
    const paymentFields = ['amount_tax_incl', 'payment_status', 'payment_method', 'payment_date', 'payment_amount']
    const systemFields = ['uid', 'id', 'event_uid', 'profile_uid', 'created_at', 'updated_at', 'anonymized_at']
    const accompanyingFields = ['accompanying', 'accompanying_title', 'accompanying_firstname', 'accompanying_lastname', 'accompanying_email']
    
    if (personalFields.includes(fieldName)) return 'personal'
    if (companyFields.includes(fieldName)) return 'company'
    if (eventFields.includes(fieldName)) return 'event'
    if (paymentFields.includes(fieldName)) return 'payment'
    if (systemFields.includes(fieldName)) return 'system'
    if (accompanyingFields.includes(fieldName)) return 'accompanying'
    if (fieldName.startsWith('data.')) return 'custom'
    
    return 'other'
  }

  // Generate human-readable labels for fields
  private static generateFieldLabel(fieldName: string): string {
    const labelMap: { [key: string]: string } = {
      'first_name': 'First Name',
      'last_name': 'Last Name',
      'firstname': 'First Name',
      'lastname': 'Last Name',
      'job_title': 'Job Title',
      'mobile_phone': 'Mobile Phone',
      'cpy_name': 'Company Name',
      'cpy_street': 'Company Street',
      'cpy_city': 'Company City',
      'cpy_country': 'Company Country',
      'cpy_zip_code': 'Company ZIP Code',
      'cpy_state': 'Company State',
      'cpy_vat_number': 'Company VAT Number',
      'registration_status': 'Registration Status',
      'payment_status': 'Payment Status',
      'payment_method': 'Payment Method',
      'payment_date': 'Payment Date',
      'payment_amount': 'Payment Amount',
      'amount_tax_incl': 'Total Amount (Tax Incl.)',
      'amount_tax_excl': 'Total Amount (Tax Excl.)',
      'accompanying': 'Has Accompanying Person',
      'accompanying_firstname': 'Accompanying First Name',
      'accompanying_lastname': 'Accompanying Last Name',
      'accompanying_email': 'Accompanying Email',
      'accompanying_mobile_phone': 'Accompanying Mobile Phone',
      'hotel_notes': 'Hotel Notes',
      'check_ins': 'Check-ins Count',
      'first_check_in_at': 'First Check-in Date'
    }
    
    if (labelMap[fieldName]) {
      return labelMap[fieldName]
    }
    
    // Generate label from field name
    return fieldName
      .replace(/^data\./, '') // Remove data prefix
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim()
  }

  // Get sync statistics for an event
  async getSyncStatistics(eventUid: string): Promise<{
    totalGuests: number
    lastUpdated: string | null
    registrationStatuses: { [key: string]: number }
    paymentStatuses: { [key: string]: number }
  }> {
    try {
      const response = await this.getAllEventGuests(eventUid, '', undefined)
      
      if (!response.success || !response.data) {
        throw new Error('Failed to load guest statistics')
      }

      const guests = response.data
      const stats = {
        totalGuests: guests.length,
        lastUpdated: guests.reduce((latest, guest) => {
          const guestUpdated = new Date(guest.updated_at)
          return !latest || guestUpdated > new Date(latest) ? guest.updated_at : latest
        }, null as string | null),
        registrationStatuses: {},
        paymentStatuses: {}
      }

      // Count registration statuses
      guests.forEach(guest => {
        const status = guest.registration_status || 'Unknown'
        stats.registrationStatuses[status] = (stats.registrationStatuses[status] || 0) + 1
      })

      // Count payment statuses
      guests.forEach(guest => {
        const status = guest.payment_status || 'Unknown'
        stats.paymentStatuses[status] = (stats.paymentStatuses[status] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting sync statistics:', error)
      throw error
    }
  }

  // Utility method to validate API credentials
  async validateCredentials(): Promise<{ valid: boolean; error?: string; userInfo?: any }> {
    try {
      console.log('Validating IDLoom API credentials...')
      
      // Use the dedicated auth endpoint for credential validation
      const response = await this.makeRequest('/other/auth')
      
      if (response.success) {
        return {
          valid: true,
          userInfo: {
            accountName: response.data?.account_name,
            integrationName: response.data?.integration_name,
            baseUrl: this.baseUrl,
            hasAccess: true,
            testedAt: new Date().toISOString()
          }
        }
      } else {
        return {
          valid: false,
          error: response.error || 'Invalid credentials or no access'
        }
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }
}

// Export singleton instance
export const idloomApi = new IDLoomApiService()