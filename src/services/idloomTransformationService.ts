// IDLoom Data Transformation Service
// Handles transformation of raw IDLoom webhook data to attendee format

import { supabase } from '../lib/supabase'

export interface TransformationResult {
  success: boolean
  mainAttendee?: any
  spouseAttendee?: any
  errors: string[]
  warnings: string[]
  rawDataId: string
  requiresReview: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface BatchTransformationResult {
  totalRecords: number
  successfulTransformations: number
  failedTransformations: number
  requiresReview: number
  results: TransformationResult[]
  batchId: string
}

export class IDLoomTransformationService {
  
  // Main transformation function - converts raw IDLoom webhook data to attendee format
  static async transformRawRecord(rawRecord: any, manualOverrides?: any): Promise<TransformationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let confidence: 'high' | 'medium' | 'low' = 'high'
    
    try {
      const guestData = rawRecord.raw_data
      
      // Extract basic attendee information
      const basicInfo = await this.extractBasicInfo(guestData, errors, warnings)
      if (!basicInfo) {
        return {
          success: false,
          errors: ['Failed to extract basic attendee information'],
          warnings,
          rawDataId: rawRecord.id,
          requiresReview: true,
          confidence: 'low'
        }
      }

      // Apply manual overrides if provided
      if (manualOverrides) {
        Object.assign(basicInfo, manualOverrides)
      }

      // Derive attendee attributes based on business rules
      const attributes = this.deriveAttendeeAttributes(guestData, basicInfo, warnings)
      
      // Determine confidence level
      confidence = this.calculateConfidence(basicInfo, attributes, guestData)

      // Create main attendee record
      const mainAttendee = {
        // Basic information
        salutation: this.cleanString(basicInfo.salutation),
        first_name: this.cleanString(basicInfo.firstName),
        last_name: this.cleanString(basicInfo.lastName),
        email: this.cleanEmail(basicInfo.email),
        title: this.cleanString(basicInfo.title),
        company: this.cleanString(basicInfo.company),
        bio: this.cleanString(basicInfo.bio),
        photo: basicInfo.photo || 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
        
        // Contact information
        business_phone: this.cleanPhoneNumber(basicInfo.businessPhone),
        mobile_phone: this.cleanPhoneNumber(basicInfo.mobilePhone),
        
        // Hotel and travel
        check_in_date: this.cleanDate(basicInfo.checkInDate, '2025-03-15'),
        check_out_date: this.cleanDate(basicInfo.checkOutDate, '2025-03-17'),
        hotel_selection: basicInfo.hotelSelection || 'grand-hotel',
        custom_hotel: this.cleanString(basicInfo.customHotel),
        room_type: this.cleanString(basicInfo.roomType),
        
        // Registration details
        registration_id: this.cleanString(basicInfo.registrationId || guestData.id || guestData.uid),
        has_spouse: Boolean(basicInfo.hasSpouse),
        spouse_details: basicInfo.spouseDetails || {},
        dining_selections: basicInfo.diningSelections || {},
        selected_breakouts: Array.isArray(basicInfo.selectedBreakouts) ? basicInfo.selectedBreakouts : [],
        registration_status: this.validateRegistrationStatus(basicInfo.registrationStatus || guestData.registration_status),
        access_code: basicInfo.accessCode || this.generateAccessCode(),
        
        // Attributes and classifications
        attributes: attributes,
        dietary_requirements: this.cleanString(basicInfo.dietaryRequirements),
        
        // Address information
        address1: this.cleanString(basicInfo.address1),
        address2: this.cleanString(basicInfo.address2),
        postal_code: this.cleanString(basicInfo.postalCode),
        city: this.cleanString(basicInfo.city),
        state: this.cleanString(basicInfo.state),
        country: this.cleanString(basicInfo.country),
        country_code: this.cleanString(basicInfo.countryCode),
        
        // Assistant information
        assistant_name: this.cleanString(basicInfo.assistantName),
        assistant_email: this.cleanEmail(basicInfo.assistantEmail),
        
        // IDLoom tracking
        idloom_id: guestData.uid || guestData.id || '',
        last_synced_at: new Date().toISOString(),
        
        // Special flags
        is_cfo: attributes.cfo || false,
        is_apax_ep: attributes.apaxEP || false,
        is_spouse: false,
        primary_attendee_id: null,
        company_name_standardized: null // Will be set by company standardization process
      }

      // Create spouse attendee record if applicable
      let spouseAttendee = null
      if (basicInfo.hasSpouse && basicInfo.spouseDetails && 
          basicInfo.spouseDetails.firstName && basicInfo.spouseDetails.lastName) {
        
        spouseAttendee = this.createSpouseRecord(mainAttendee, basicInfo.spouseDetails, guestData)
      }

      // Validate required fields
      const validationErrors = this.validateRequiredFields(mainAttendee)
      if (validationErrors.length > 0) {
        errors.push(...validationErrors)
        confidence = 'low'
      }

      return {
        success: errors.length === 0,
        mainAttendee: errors.length === 0 ? mainAttendee : undefined,
        spouseAttendee,
        errors,
        warnings,
        rawDataId: rawRecord.id,
        requiresReview: confidence === 'low' || errors.length > 0 || warnings.length > 3,
        confidence
      }
      
    } catch (error) {
      return {
        success: false,
        errors: [`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        rawDataId: rawRecord.id,
        requiresReview: true,
        confidence: 'low'
      }
    }
  }

  // Extract basic attendee information from raw IDLoom data
  private static async extractBasicInfo(guestData: any, errors: string[], warnings: string[]): Promise<any | null> {
    try {
      // Try multiple field name variations for each piece of information
      const firstName = this.getFieldValue(guestData, ['first_name', 'firstname', 'data.first_name', 'data.firstname'])
      const lastName = this.getFieldValue(guestData, ['last_name', 'lastname', 'data.last_name', 'data.lastname'])
      const email = this.getFieldValue(guestData, ['email', 'data.email', 'data.email_address'])
      const company = this.getFieldValue(guestData, ['cpy_name', 'company', 'data.company', 'data.cpy_name', 'data.company_name'])

      // Extract professional title, prioritizing job_title and position
      const title = this.getFieldValue(guestData, ['job_title', 'data.job_title', 'position', 'data.position']) || 'N/A'

      // Validate required fields
      if (!firstName || !lastName) {
        errors.push('Missing required name information')
        return null
      }

      if (!title || title === 'N/A') {
        warnings.push('Missing job title')
      }

      if (!company) {
        warnings.push('Missing company information')
      }

      // Extract additional information
      // Extract salutation, prioritizing salutation field, then the generic 'title' field (which often contains salutations in IDLoom)
      const salutation = this.getFieldValue(guestData, ['salutation', 'data.salutation', 'title', 'data.title'])
      const bio = this.getFieldValue(guestData, ['bio', 'biography', 'data.bio', 'data.biography', 'data.description'])
      const businessPhone = this.getFieldValue(guestData, ['phone', 'business_phone', 'data.phone', 'data.business_phone'])
      const mobilePhone = this.getFieldValue(guestData, ['mobile_phone', 'cell_phone', 'data.mobile_phone', 'data.cell_phone'])
      
      // Extract dietary requirements from free_field6
      const dietaryRequirements = this.getFieldValue(guestData, ['free_field6', 'data.free_field6', 'dietary_requirements', 'data.dietary_requirements'])
      
      // Extract assistant information
      const assistantName = this.getFieldValue(guestData, ['free_field2', 'data.free_field2']) || ''
      const assistantEmail = this.getFieldValue(guestData, ['email_contact_confirmations', 'data.email_contact_confirmations']) || ''
      
      // Extract address information
      const address1 = this.getFieldValue(guestData, ['cpy_street', 'data.cpy_street', 'address', 'data.address'])
      const address2 = this.getFieldValue(guestData, ['cpy_street_number', 'data.cpy_street_number', 'address2', 'data.address2'])
      const city = this.getFieldValue(guestData, ['cpy_city', 'data.cpy_city', 'city', 'data.city'])
      const state = this.getFieldValue(guestData, ['cpy_state', 'data.cpy_state', 'state', 'data.state'])
      const country = this.getFieldValue(guestData, ['cpy_country_name', 'data.cpy_country_name', 'country', 'data.country'])
      
      // Hotel and travel information - prioritize category dates and hotel field
      const checkInDate = this.getFieldValue(guestData, ['category.start_date', 'arrival', 'check_in', 'data.arrival', 'data.check_in_date'])
      const checkOutDate = this.getFieldValue(guestData, ['category.end_date', 'departure', 'check_out', 'data.departure', 'data.check_out_date'])
      const hotelName = this.getFieldValue(guestData, ['hotel', 'hotel_selection', 'data.hotel', 'data.hotel_selection', 'hotel_name'])
      const roomType = this.getFieldValue(guestData, ['room_type', 'data.room_type', 'data.room_preference'])
      
      const postalCode = this.getFieldValue(guestData, ['cpy_zip_code', 'postal_code', 'zip_code', 'data.postal_code', 'data.zip_code'])
      
      // Extract spouse information with enhanced debugging
      console.log('DEBUG: Starting spouse extraction for guest:', guestData.firstname, guestData.lastname)
      console.log('DEBUG: Raw accompanying field:', guestData.accompanying)
      console.log('DEBUG: Available spouse fields in raw data:', {
        accompanying_title: guestData.accompanying_title,
        accompanying_firstname: guestData.accompanying_firstname,
        accompanying_lastname: guestData.accompanying_lastname,
        accompanying_email: guestData.accompanying_email,
        accompanying_mobile_phone: guestData.accompanying_mobile_phone,
        accompanying_free_field1: guestData.accompanying_free_field1
      })
      
      const spouseDetails = this.extractSpouseDetails(guestData, warnings)
      console.log('DEBUG: Extracted spouse details object:', spouseDetails)
      
      // Check for spouse by looking for actual spouse data fields, not just the accompanying boolean
      const hasSpouse = spouseDetails && (spouseDetails.firstName || spouseDetails.lastName)
      console.log('DEBUG: Final hasSpouse determination:', hasSpouse)

      // Extract hotel selection and custom hotel
      const hotelInfo = await this.validateHotelSelection(hotelName)
      
      console.log('Hotel parsing debug:', {
        rawHotelValue: guestData.hotel,
        extractedHotelName: hotelName,
        hotelInfo: hotelInfo,
        guestDataKeys: Object.keys(guestData)
      })

      // Extract breakout session selections
      const selectedBreakouts = await this.extractBreakoutSelections(guestData, warnings)

      // Extract dining selections
      const diningSelections = this.extractDiningSelections(guestData, warnings)
      
      console.log('DEBUG: Assistant name extraction:', {
        free_field2: guestData.free_field2,
        assistantName: assistantName,
        guestDataKeys: Object.keys(guestData)
      })
      
      return {
        firstName,
        lastName,
        email,
        title,
        company,
        salutation,
        bio,
        businessPhone,
        mobilePhone,
        dietaryRequirements,
        assistantName,
        assistantEmail,
        checkInDate,
        checkOutDate,
        hotelSelection: hotelInfo.hotelSelection,
        customHotel: hotelInfo.customHotel,
        roomType,
        address1,
        address2,
        city,
        state,
        country,
        postalCode,
        hasSpouse,
        spouseDetails,
        selectedBreakouts,
        diningSelections,
        registrationStatus: guestData.registration_status
      }
      
    } catch (error) {
      errors.push(`Error extracting basic info: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }

  // Extract spouse/accompanying person details
  private static extractSpouseDetails(guestData: any, warnings: string[]): any {
    const spouseFirstName = this.getFieldValue(guestData, ['accompanying_firstname', 'spouse_first_name', 'data.accompanying_firstname', 'data.spouse_first_name'])
    const spouseLastName = this.getFieldValue(guestData, ['accompanying_lastname', 'spouse_last_name', 'data.accompanying_lastname', 'data.spouse_last_name'])
    const spouseEmail = this.getFieldValue(guestData, ['accompanying_email', 'spouse_email', 'data.accompanying_email', 'data.spouse_email'])
    const spousePhone = this.getFieldValue(guestData, ['accompanying_mobile_phone', 'spouse_phone', 'data.accompanying_mobile_phone', 'data.spouse_phone'])
    const spouseSalutation = this.getFieldValue(guestData, ['accompanying_title', 'spouse_title', 'data.accompanying_title', 'data.spouse_title', 'accompanying_salutation', 'data.accompanying_salutation'])
    const spouseDietary = this.getFieldValue(guestData, ['accompanying_free_field1', 'data.accompanying_free_field1', 'spouse_dietary_requirements', 'data.spouse_dietary_requirements'])

    if (!spouseFirstName && !spouseLastName) {
      return {}
    }

    if (!spouseFirstName || !spouseLastName) {
      warnings.push('Incomplete spouse name information')
    }

    return {
      salutation: spouseSalutation || '',
      firstName: spouseFirstName || '',
      lastName: spouseLastName || '',
      email: spouseEmail || '',
      mobilePhone: spousePhone || '',
      dietaryRequirements: spouseDietary || ''
    }
  }

  // Derive attendee attributes based on business rules
  private static deriveAttendeeAttributes(guestData: any, basicInfo: any, warnings: string[]): any {
    const attributes = {
      apaxIP: false,
      apaxOther: false,
      apaxOEP: false,
      apaxEP: false,
      portfolioCompanyExecutive: false,
      sponsorAttendee: false,
      speaker: false,
      otherAttendeeType: false,
      ceo: false,
      cfo: false,
      cro: false,
      coo: false,
      chro: false,
      ctoCio: false,
      otherCLevelExec: false,
      nonCLevelExec: false
    }

    const title = (basicInfo.title || '').toLowerCase()
    const company = (basicInfo.company || '').toLowerCase()
    
    // Check for explicit IDLoom custom fields first
    const explicitApaxIP = this.getBooleanValue(guestData, ['data.apax_ip', 'data.apaxIP', 'apax_ip', 'apaxIP'])
    const explicitApaxOEP = this.getBooleanValue(guestData, ['data.apax_oep', 'data.apaxOEP', 'apax_oep', 'apaxOEP'])
    const explicitApaxEP = this.getBooleanValue(guestData, ['data.apax_ep', 'data.apaxEP', 'apax_ep', 'apaxEP'])
    const explicitCEO = this.getBooleanValue(guestData, ['data.ceo', 'data.is_ceo', 'ceo', 'is_ceo'])
    const explicitCFO = this.getBooleanValue(guestData, ['data.cfo', 'data.is_cfo', 'cfo', 'is_cfo'])
    const explicitSponsor = this.getBooleanValue(guestData, ['data.sponsor', 'data.vendor', 'sponsor', 'vendor'])
    const explicitSpeaker = this.getBooleanValue(guestData, ['data.speaker', 'data.presenter', 'speaker', 'presenter'])

    // Apply explicit flags if found
    if (explicitApaxIP) attributes.apaxIP = true
    if (explicitApaxOEP) attributes.apaxOEP = true
    if (explicitApaxEP) attributes.apaxEP = true
    if (explicitCEO) attributes.ceo = true
    if (explicitCFO) attributes.cfo = true
    if (explicitSponsor) attributes.sponsorAttendee = true
    if (explicitSpeaker) attributes.speaker = true

    // Infer from company name if no explicit flags
    if (!explicitApaxIP && !explicitApaxOEP && !explicitApaxEP) {
      if (company.includes('apax')) {
        if (company.includes('oep') || company.includes('operating excellence')) {
          attributes.apaxOEP = true
        } else if (company.includes('ep') || company.includes('executive partners')) {
          attributes.apaxEP = true
        } else {
          attributes.apaxIP = true // Default Apax to IP
        }
      }
    }

    // Infer from job title
    if (!explicitCEO && (title.includes('ceo') || title.includes('chief executive'))) {
      attributes.ceo = true
    }
    
    if (!explicitCFO && (title.includes('cfo') || title.includes('chief financial'))) {
      attributes.cfo = true
    }
    
    if (title.includes('cro') || title.includes('chief revenue')) {
      attributes.cro = true
    }
    
    if (title.includes('coo') || title.includes('chief operating')) {
      attributes.coo = true
    }
    
    if (title.includes('chro') || title.includes('chief human resources')) {
      attributes.chro = true
    }

    if (title.includes('cto') || title.includes('chief technology') || title.includes('cio') || title.includes('chief information')) {
      attributes.ctoCio = true
    }

    // Other C-level positions
    if (title.includes('chief') && !attributes.ceo && !attributes.cfo && !attributes.cro && !attributes.coo && !attributes.chro) {
      attributes.otherCLevelExec = true
    }

    // Portfolio company executive (if not Apax and not vendor/sponsor)
    if (!attributes.apaxIP && !attributes.apaxOEP && !attributes.apaxEP && !attributes.sponsorAttendee) {
      // Check for portfolio company indicators
      const portfolioIndicators = ['portfolio', 'investment', 'private equity', 'pe firm']
      const isPortfolioCompany = portfolioIndicators.some(indicator => 
        company.includes(indicator) || title.includes(indicator)
      )
      
      if (isPortfolioCompany || (attributes.ceo || attributes.cfo || attributes.cro || attributes.coo || attributes.chro || attributes.otherCLevelExec)) {
        attributes.portfolioCompanyExecutive = true
      }
    }

    // Vendor/sponsor detection
    if (!explicitSponsor && !attributes.apaxIP && !attributes.apaxOEP && !attributes.apaxEP) {
      const vendorIndicators = ['consulting', 'advisory', 'services', 'solutions', 'technology', 'software', 'vendor', 'sponsor']
      const isVendor = vendorIndicators.some(indicator => company.includes(indicator))
      
      if (isVendor) {
        attributes.sponsorAttendee = true
        attributes.portfolioCompanyExecutive = false // Mutual exclusivity
      }
    }

    // Speaker detection
    if (!explicitSpeaker) {
      const speakerIndicators = ['speaker', 'presenter', 'keynote', 'moderator']
      const isSpeaker = speakerIndicators.some(indicator => 
        title.includes(indicator) || (guestData.notes && guestData.notes.toLowerCase().includes(indicator))
      )
      
      if (isSpeaker) {
        attributes.speaker = true
      }
    }

    // Non C-level executive classification
    if (!attributes.ceo && !attributes.cfo && !attributes.cro && !attributes.coo && !attributes.chro && !attributes.otherCLevelExec) {
      const executiveIndicators = ['director', 'vp', 'vice president', 'president', 'manager', 'head of']
      const isExecutive = executiveIndicators.some(indicator => title.includes(indicator))
      
      if (isExecutive) {
        attributes.nonCLevelExec = true
      } else {
        attributes.otherAttendeeType = true
      }
    }

    // Log attribute derivation for debugging
    if (attributes.apaxIP || attributes.apaxOEP || attributes.apaxEP) {
      console.log(`Derived Apax attributes for ${basicInfo.firstName} ${basicInfo.lastName}:`, {
        apaxIP: attributes.apaxIP,
        apaxOEP: attributes.apaxOEP,
        apaxEP: attributes.apaxEP,
        company: basicInfo.company
      })
    }

    return attributes
  }

  // Extract breakout session selections from IDLoom options
  private static async extractBreakoutSelections(guestData: any, warnings: string[]): Promise<string[]> {
    let selectedBreakout: string | null = null
    
    try {
      const options = guestData.options || []
      
      for (const option of options) {
        if (!option || !option.name || !option.full_name) continue
        
        const optionName = option.name.toLowerCase()
        const fullName = option.full_name.toLowerCase()
        
        // Check for Apax Software CEO Summit selection
        if (optionName.includes('apax software ceo summit') || 
            fullName.includes('apax software ceo summit') ||
            fullName.includes('strategic offsite for apax software ceo')) {
          selectedBreakout = 'apax-software-ceo-summit'
          break // Found a selection, stop looking
        }
        // Check for Track A selection
        else if (optionName.includes('track a') || fullName.includes('track a')) {
          selectedBreakout = 'track-a-revenue-growth'
          break // Found a selection, stop looking
        }
        // Check for Track B selection  
        else if (optionName.includes('track b') || fullName.includes('track b')) {
          selectedBreakout = 'track-b-operational-performance'
          break // Found a selection, stop looking
        }
      }
      
      if (selectedBreakout) {
        console.log('Extracted breakout selection:', selectedBreakout)
        return [selectedBreakout]
      }
        
    } catch (error) {
      warnings.push(`Error extracting breakout selections: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return []
  }

  // Extract dining selections from IDLoom options
  private static extractDiningSelections(guestData: any, warnings: string[]): any {
    const diningSelections: any = {}
    
    try {
      const options = guestData.options || []
      
      for (const option of options) {
        if (!option || !option.name || !option.full_name) continue
        
        const optionName = option.name.toLowerCase()
        const fullName = option.full_name.toLowerCase()
        const isAttending = optionName === 'yes, i will attend'
        
        // Check for dining events
        let diningKey = null
        let eventName = ''
        
        if (fullName.includes('welcome dinner') && fullName.includes('cloudbar')) {
          diningKey = 'welcome-dinner-cloud-bar'
          eventName = 'Welcome Dinner at Cloud Bar'
        } else if (fullName.includes('networking') && fullName.includes('maple')) {
          diningKey = 'networking-cocktails-maple-ash'
          eventName = 'Networking Cocktails at Maple & Ash'
        } else if (fullName.includes('dinner') || fullName.includes('lunch') || fullName.includes('reception') || fullName.includes('cocktails')) {
          // Generic dining event - create key from location or event name
          if (option.location && option.location.name) {
            const locationName = option.location.name.toLowerCase()
            if (locationName.includes('cloud')) {
              diningKey = 'event-cloud-bar'
              eventName = 'Event at Cloud Bar'
            } else if (locationName.includes('maple')) {
              diningKey = 'event-maple-ash'
              eventName = 'Event at Maple & Ash'
            } else {
              // Create generic key from location
              diningKey = locationName
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50)
              eventName = option.location.name
            }
          } else {
            // Create key from full name
            diningKey = fullName
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '-')
              .substring(0, 50)
            eventName = option.full_name
          }
        }
        
        if (diningKey) {
          diningSelections[diningKey] = {
            attending: isAttending,
            eventName: eventName,
            location: option.location?.name || '',
            startDate: option.start_date || '',
            endDate: option.end_date || ''
          }
        }
      }
      
      if (Object.keys(diningSelections).length > 0) {
        console.log('Extracted dining selections:', diningSelections)
      }
      
    } catch (error) {
      warnings.push(`Error extracting dining selections: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    return diningSelections
  }

  // Create spouse attendee record
  private static createSpouseRecord(mainAttendee: any, spouseDetails: any, guestData: any): any {
    return {
      // Basic information
      salutation: this.cleanString(spouseDetails.salutation),
      first_name: this.cleanString(spouseDetails.firstName),
      last_name: this.cleanString(spouseDetails.lastName),
      email: this.cleanEmail(spouseDetails.email), // Can be empty for spouses
      title: 'Spouse/Partner' || '', // Ensure non-null title for spouses
      company: mainAttendee.company, // Same company as primary attendee
      bio: '',
      photo: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400',
      
      // Contact information
      business_phone: '',
      mobile_phone: this.cleanPhoneNumber(spouseDetails.mobilePhone),
      
      // Hotel and travel (same as primary attendee)
      check_in_date: mainAttendee.check_in_date,
      check_out_date: mainAttendee.check_out_date,
      hotel_selection: mainAttendee.hotel_selection,
      custom_hotel: mainAttendee.custom_hotel,
      room_type: mainAttendee.room_type,
      
      // Registration details
      registration_id: '',
      has_spouse: false,
      spouse_details: {},
      dining_selections: {},
      selected_breakouts: [],
      registration_status: 'confirmed',
      access_code: this.generateAccessCode(),
      
      // Attributes (spouse-specific)
      attributes: {
        apaxIP: false,
        apaxOther: false,
        apaxOEP: false,
        apaxEP: false,
        portfolioCompanyExecutive: false,
        sponsorAttendee: false,
        speaker: false,
        spouse: true, // Mark as spouse
        ceo: false,
        cfo: false,
        cro: false,
        coo: false,
        chro: false,
        otherCLevelExec: false,
        nonCLevelExec: false,
        otherAttendeeType: false
      },
      dietary_requirements: this.cleanString(spouseDetails.dietaryRequirements),
      
      // Address information (same as primary attendee)
      address1: mainAttendee.address1,
      address2: mainAttendee.address2,
      postal_code: mainAttendee.postal_code,
      city: mainAttendee.city,
      state: mainAttendee.state,
      country: mainAttendee.country,
      country_code: mainAttendee.country_code,
      
      // Assistant information
      assistant_name: '',
      assistant_email: '',
      
      // IDLoom tracking
      idloom_id: `${guestData.uid || guestData.id}-spouse`,
      last_synced_at: new Date().toISOString(),
      
      // Special flags
      is_cfo: false,
      is_apax_ep: false,
      is_spouse: true,
      primary_attendee_id: null, // Will be set after main attendee is created
      company_name_standardized: null
    }
  }

  // Calculate confidence level for transformation
  private static calculateConfidence(basicInfo: any, attributes: any, guestData: any): 'high' | 'medium' | 'low' {
    let score = 0
    let maxScore = 0

    // Required fields (high weight)
    maxScore += 40
    if (basicInfo.firstName && basicInfo.lastName) score += 20
    if (basicInfo.email && this.isValidEmail(basicInfo.email)) score += 10
    if (basicInfo.title) score += 5
    if (basicInfo.company) score += 5

    // Attribute confidence (medium weight)
    maxScore += 30
    const hasExplicitAttributes = Object.values(attributes).some(v => v === true)
    if (hasExplicitAttributes) score += 15
    
    const hasApaxClassification = attributes.apaxIP || attributes.apaxOEP || attributes.apaxEP
    const hasRoleClassification = attributes.ceo || attributes.cfo || attributes.cro || attributes.coo || attributes.chro
    if (hasApaxClassification || hasRoleClassification) score += 15

    // Data completeness (low weight)
    maxScore += 30
    if (basicInfo.businessPhone || basicInfo.mobilePhone) score += 5
    if (basicInfo.checkInDate && basicInfo.checkOutDate) score += 5
    if (basicInfo.address1 && basicInfo.city) score += 5
    if (basicInfo.bio) score += 5
    if (basicInfo.dietaryRequirements) score += 5
    if (basicInfo.hasSpouse && basicInfo.spouseDetails.firstName) score += 5

    const confidenceRatio = score / maxScore

    if (confidenceRatio >= 0.8) return 'high'
    if (confidenceRatio >= 0.6) return 'medium'
    return 'low'
  }

  // Utility function to get field value from multiple possible paths
  private static getFieldValue(obj: any, paths: string[]): string | null {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path)
      if (value !== undefined && value !== null && value !== '') {
        return String(value).trim()
      }
    }
    return null
  }

  // Utility function to get boolean value from multiple possible paths
  private static getBooleanValue(obj: any, paths: string[]): boolean {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path)
      if (value !== undefined && value !== null) {
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim()
          return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
        }
        if (typeof value === 'number') return value !== 0
      }
    }
    return false
  }

  // Helper function to get nested values from objects
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key]
      }
      return undefined
    }, obj)
  }

  // Helper function to set nested values in objects
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()
    
    if (!lastKey) return
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {}
      }
      return current[key]
    }, obj)
    
    target[lastKey] = value
  }

  // Data cleaning and validation functions
  private static cleanString(value: any): string {
    if (!value) return ''
    return String(value).trim()
  }

  private static cleanEmail(value: any): string {
    if (!value) return ''
    const email = String(value).trim().toLowerCase()
    return this.isValidEmail(email) ? email : ''
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private static cleanPhoneNumber(value: any): string {
    if (!value) return ''
    
    let phone = String(value).trim()
    
    // Remove all non-digit characters except + at the beginning
    if (phone.startsWith('+')) {
      phone = '+' + phone.slice(1).replace(/[^\d]/g, '')
    } else {
      phone = phone.replace(/[^\d]/g, '')
    }
    
    return phone
  }

  private static cleanDate(value: any, defaultDate: string): string {
    if (!value) return defaultDate
    
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return defaultDate
      }
      return date.toISOString().split('T')[0]
    } catch {
      return defaultDate
    }
  }

  // Enhanced hotel selection validation with custom hotel handling
  static async validateHotelSelection(value: any): Promise<{ hotelSelection: string; customHotel: string }> {
    let hotelName = ''
    
    // Enhanced extraction logic to handle different data structures
    if (typeof value === 'string') {
      hotelName = value.trim()
    } else if (typeof value === 'object' && value !== null) {
      // Try multiple possible object properties
      hotelName = value.name || value.hotel || value.title || value.hotel_name || 
                  value.location || value.venue || String(value).trim()
    } else {
      hotelName = String(value || '').trim()
    }
    
    console.log('Hotel validation debug - Enhanced:', {
      originalValue: value,
      valueType: typeof value,
      extractedHotelName: hotelName,
      isObject: typeof value === 'object',
      objectKeys: typeof value === 'object' && value !== null ? Object.keys(value) : null
    })
    
    // If we still don't have a hotel name, return default
    if (!hotelName) {
      console.log('No hotel name found, using default')
      return { hotelSelection: 'custom', customHotel: '' }
    }
    
    // Get actual hotels from database
    const { data: availableHotels, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    
    if (error) {
      console.error('Error loading hotels:', error)
      return { hotelSelection: 'custom', customHotel: hotelName || '' }
    }
    
    const lowerHotelName = hotelName.toLowerCase()
    
    console.log('Hotel matching debug:', {
      hotelName,
      lowerHotelName,
      availableHotelsCount: availableHotels?.length || 0,
      availableHotelNames: availableHotels?.map(h => h.name) || []
    })
    
    // Try to match against actual hotels in the database
    for (const hotel of (availableHotels || [])) {
      const hotelNameLower = hotel.name.toLowerCase()
      
      console.log('Checking hotel match:', {
        dbHotelName: hotel.name,
        dbHotelId: hotel.id,
        inputHotelName: hotelName,
        match: lowerHotelName.includes(hotelNameLower) || hotelNameLower.includes(lowerHotelName)
      })
      
      // Check for exact or partial matches
      if (lowerHotelName.includes('four seasons') && hotelNameLower.includes('four seasons')) {
        console.log('Matched Four Seasons hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('park hyatt') && hotelNameLower.includes('park hyatt')) {
        console.log('Matched Park Hyatt hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('hyatt') && hotelNameLower.includes('hyatt')) {
        console.log('Matched Hyatt hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('ritz') && hotelNameLower.includes('ritz')) {
        console.log('Matched Ritz hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('marriott') && hotelNameLower.includes('marriott')) {
        console.log('Matched Marriott hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('chicago') && hotelNameLower.includes('chicago')) {
        console.log('Matched Chicago hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      if (lowerHotelName.includes('grand') && hotelNameLower.includes('grand')) {
        console.log('Matched Grand hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
      // Check for "own arrangements" indicators
      if ((lowerHotelName.includes('own') || lowerHotelName.includes('arrangement')) && 
          (hotelNameLower.includes('own') || hotelNameLower.includes('arrangement'))) {
        console.log('Matched own arrangements hotel:', hotel.name, hotel.id)
        return { hotelSelection: hotel.id, customHotel: '' }
      }
    }
    
    console.log('No hotel match found, using custom hotel:', hotelName)
    // If no match found, use custom hotel with the full hotel name
    return { hotelSelection: 'custom', customHotel: hotelName }
  }

  private static validateRegistrationStatus(value: any): string {
    const validStatuses = ['confirmed', 'pending', 'cancelled']
    const status = String(value || '').toLowerCase().trim()
    
    // Map IDLoom statuses to our statuses
    if (status === 'complete' || status === 'confirmed' || status === 'paid') return 'confirmed'
    if (status === 'pending' || status === 'incomplete') return 'pending'
    if (status === 'cancelled' || status === 'canceled' || status === 'rejected') return 'cancelled'
    
    return 'confirmed' // Default to confirmed
  }

  private static generateAccessCode(): string {
    return Math.random().toString().slice(2, 8)
  }

  private static validateRequiredFields(attendee: any): string[] {
    const errors: string[] = []
    
    if (!attendee.first_name || attendee.first_name.trim() === '') {
      errors.push('First name is required')
    }
    
    if (!attendee.last_name || attendee.last_name.trim() === '') {
      errors.push('Last name is required')
    }
    
    if (!attendee.title || attendee.title.trim() === '') {
      errors.push('Job title is required')
    }
    
    if (!attendee.company || attendee.company.trim() === '') {
      errors.push('Company is required')
    }
    
    if (attendee.email && !this.isValidEmail(attendee.email)) {
      errors.push('Invalid email format')
    }
    
    return errors
  }

  // Format date strings to YYYY-MM-DD format
  private static formatDate(dateValue: any): string | null {
    if (!dateValue) return null
    
    try {
      // If it's already a valid date string, return it
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        return dateValue.split('T')[0] // Remove time component if present
      }
      
      // Try to parse as date and format
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
      
      return null
    } catch (error) {
      console.error('Error formatting date:', error)
      return null
    }
  }

  static extractSpouseDetails(rawData: any): any {
    console.log('DEBUG: extractSpouseDetails method called')
    console.log('DEBUG: Raw accompanying field:', rawData.accompanying)
    console.log('DEBUG: Available spouse fields in raw data:', {
      accompanying_title: rawData.accompanying_title,
      accompanying_firstname: rawData.accompanying_firstname,
      accompanying_lastname: rawData.accompanying_lastname,
      accompanying_email: rawData.accompanying_email,
      accompanying_mobile_phone: rawData.accompanying_mobile_phone,
      accompanying_free_field1: rawData.accompanying_free_field1
    })
    
    let spouseDetails: any = {}
    
    try {
      console.log('DEBUG: Extracting spouse details from raw data:', {
        accompanying_title: rawData.accompanying_title,
        accompanying_firstname: rawData.accompanying_firstname,
        accompanying_lastname: rawData.accompanying_lastname,
        accompanying_email: rawData.accompanying_email,
        accompanying_mobile_phone: rawData.accompanying_mobile_phone,
        accompanying_free_field1: rawData.accompanying_free_field1,
        accompanying_phone: rawData.accompanying_phone
      })
      
      if (rawData.accompanying_firstname || rawData.accompanying_lastname) {
        console.log('DEBUG: Found spouse name fields, extracting details...')
        spouseDetails.salutation = rawData.accompanying_title || ''
        spouseDetails.firstName = rawData.accompanying_firstname || ''
        spouseDetails.lastName = rawData.accompanying_lastname || ''
        spouseDetails.email = rawData.accompanying_email || ''
        spouseDetails.mobilePhone = rawData.accompanying_mobile_phone || rawData.accompanying_phone || rawData.mobile_phone || ''
        spouseDetails.dietaryRequirements = rawData.accompanying_free_field1 || ''
        
        console.log('DEBUG: Successfully extracted spouse details:', spouseDetails)
      } else {
        console.log('DEBUG: No spouse name fields found (accompanying_firstname or accompanying_lastname missing)')
      }
    } catch (error) {
      console.error('Error extracting spouse details:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    }
    
    console.log('DEBUG: Returning spouse details:', spouseDetails)
    return spouseDetails
  }

  // Process webhook data and create/update attendees
  static async processWebhookData(rawRecord: any): Promise<{
    success: boolean
    attendeeId?: string
    spouseId?: string
    action: 'created' | 'updated' | 'skipped'
    errors: string[]
  }> {
    try {
      // Transform the raw record
      const transformResult = await this.transformRawRecord(rawRecord)
      
      if (!transformResult.success || !transformResult.mainAttendee) {
        // Mark for manual review
        await supabase
          .from('raw_attendee_data_idloom')
          .update({
            import_status: 'pending',
            import_reviewed: false,
            processing_errors: transformResult.errors,
            updated_at: new Date().toISOString()
          })
          .eq('id', rawRecord.id)

        return {
          success: false,
          action: 'skipped',
          errors: transformResult.errors
        }
      }

      // Check if attendee already exists (by IDLoom ID or email)
      const { data: existingAttendees, error: searchError } = await supabase
        .from('attendees')
        .select('id, idloom_id, email')
        .or(`idloom_id.eq.${transformResult.mainAttendee.idloom_id},email.eq.${transformResult.mainAttendee.email}`)

      if (searchError) {
        throw new Error(`Error searching for existing attendee: ${searchError.message}`)
      }

      let attendeeId: string
      let action: 'created' | 'updated' = 'created'

      if (existingAttendees && existingAttendees.length > 0) {
        // Update existing attendee
        const existingAttendee = existingAttendees[0]
        attendeeId = existingAttendee.id

        const { error: updateError } = await supabase
          .from('attendees')
          .update({
            ...transformResult.mainAttendee,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAttendee.id)

        if (updateError) {
          throw new Error(`Error updating attendee: ${updateError.message}`)
        }

        action = 'updated'
      } else {
        // Create new attendee
        const { data: newAttendee, error: createError } = await supabase
          .from('attendees')
          .insert([transformResult.mainAttendee])
          .select('id')
          .single()

        if (createError) {
          throw new Error(`Error creating attendee: ${createError.message}`)
        }

        attendeeId = newAttendee.id
      }

      // Handle spouse creation/update if applicable
      let spouseId: string | undefined
      if (transformResult.spouseAttendee) {
        // Set the primary attendee ID for the spouse
        transformResult.spouseAttendee.primary_attendee_id = attendeeId

        // Check if spouse already exists
        const { data: existingSpouse } = await supabase
          .from('attendees')
          .select('id')
          .eq('primary_attendee_id', attendeeId)
          .eq('is_spouse', true)
          .single()

        if (existingSpouse) {
          // Update existing spouse
          const { error: spouseUpdateError } = await supabase
            .from('attendees')
            .update({
              ...transformResult.spouseAttendee,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSpouse.id)

          if (spouseUpdateError) {
            console.error('Error updating spouse:', spouseUpdateError)
          } else {
            spouseId = existingSpouse.id
          }
        } else {
          // Create new spouse
          const { data: newSpouse, error: spouseCreateError } = await supabase
            .from('attendees')
            .insert([transformResult.spouseAttendee])
            .select('id')
            .single()

          if (spouseCreateError) {
            console.error('Error creating spouse:', spouseCreateError)
          } else {
            spouseId = newSpouse.id
          }
        }
      }

      // Mark raw record as processed
      await supabase
        .from('raw_attendee_data_idloom')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          attendee_id: attendeeId,
          import_status: 'approved',
          import_reviewed: true,
          processing_errors: [],
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRecord.id)

      return {
        success: true,
        attendeeId,
        spouseId,
        action,
        errors: []
      }

    } catch (error) {
      console.error('Error processing webhook data:', error)
      
      // Mark raw record with error
      await supabase
        .from('raw_attendee_data_idloom')
        .update({
          import_status: 'failed',
          processing_errors: [error instanceof Error ? error.message : 'Unknown error'],
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRecord.id)

      return {
        success: false,
        action: 'skipped',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Batch transform multiple raw records for manual review
  static async transformBatchForReview(
    batchId: string
  ): Promise<BatchTransformationResult> {
    try {
      // Get all unprocessed records for this batch
      const { data: rawRecords, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .eq('import_batch_id', batchId)
        .eq('import_reviewed', false)
        .eq('import_status', 'pending')

      if (error) throw error

      const results: TransformationResult[] = []
      let successfulTransformations = 0
      let failedTransformations = 0
      let requiresReview = 0

      for (const rawRecord of rawRecords || []) {
        const result = await this.transformRawRecord(rawRecord)
        results.push(result)
        
        if (result.success) {
          successfulTransformations++
          if (result.requiresReview) {
            requiresReview++
          }
        } else {
          failedTransformations++
          requiresReview++
        }
      }

      return {
        totalRecords: rawRecords?.length || 0,
        successfulTransformations,
        failedTransformations,
        requiresReview,
        results,
        batchId
      }
      
    } catch (error) {
      throw new Error(`Batch transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get batch transformation statistics
  static async getBatchTransformationStats(batchId: string): Promise<{
    total: number
    processed: number
    pending: number
    failed: number
    approved: number
    rejected: number
  }> {
    try {
      const { data, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select('processed, import_status, processing_errors')
        .eq('import_batch_id', batchId)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        processed: data?.filter(r => r.processed).length || 0,
        pending: data?.filter(r => r.import_status === 'pending').length || 0,
        failed: data?.filter(r => r.processing_errors && r.processing_errors.length > 0).length || 0,
        approved: data?.filter(r => r.import_status === 'approved').length || 0,
        rejected: data?.filter(r => r.import_status === 'rejected').length || 0
      }

      return stats
    } catch (error) {
      throw new Error(`Failed to get batch stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Retry failed transformations in a batch
  static async retryFailedTransformations(
    batchId: string,
    fieldMappings: any[]
  ): Promise<BatchTransformationResult> {
    try {
      // Get failed records for this batch
      const { data: rawRecords, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .eq('import_batch_id', batchId)
        .eq('import_status', 'failed')

      if (error) throw error

      const results: TransformationResult[] = []
      let successfulTransformations = 0
      let failedTransformations = 0
      let requiresReview = 0

      for (const rawRecord of rawRecords || []) {
        const result = await this.transformRawRecord(rawRecord)
        results.push(result)
        
        if (result.success) {
          successfulTransformations++
          if (result.requiresReview) {
            requiresReview++
          }
        } else {
          failedTransformations++
          requiresReview++
        }
      }

      return {
        totalRecords: rawRecords?.length || 0,
        successfulTransformations,
        failedTransformations,
        requiresReview,
        results,
        batchId
      }
    } catch (error) {
      throw new Error(`Failed to retry transformations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get pending records for manual review
  static async getPendingReviewRecords(limit: number = 50, offset: number = 0): Promise<{
    records: any[]
    total: number
    hasMore: boolean
  }> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('raw_attendee_data_idloom')
        .select('*', { count: 'exact', head: true })
        .eq('import_reviewed', false)
        .eq('import_status', 'pending')

      if (countError) throw countError

      // Get records with pagination
      const { data: records, error: recordsError } = await supabase
        .from('raw_attendee_data_idloom')
        .select('*')
        .eq('import_reviewed', false)
        .eq('import_status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (recordsError) throw recordsError

      return {
        records: records || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    } catch (error) {
      throw new Error(`Failed to get pending records: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Approve and import a reviewed record
  static async approveAndImport(
    rawRecordId: string, 
    transformedData: any, 
    spouseData?: any
  ): Promise<{ success: boolean; attendeeId?: string; spouseId?: string; errors: string[] }> {
    try {
      // Create main attendee
      const { data: newAttendee, error: createError } = await supabase
        .from('attendees')
        .upsert([transformedData], { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select('id')
        .single()

      if (createError) {
        throw new Error(`Error creating attendee: ${createError.message}`)
      }

      let spouseId: string | undefined

      // Create spouse if provided
      if (spouseData) {
        spouseData.primary_attendee_id = newAttendee.id
        
        const { data: newSpouse, error: spouseError } = await supabase
          .from('attendees')
          .insert([spouseData])
          .select('id')
          .single()

        if (spouseError) {
          console.error('Error creating spouse:', spouseError)
        } else {
          spouseId = newSpouse.id
        }
      }

      // Mark raw record as approved
      await supabase
        .from('raw_attendee_data_idloom')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          attendee_id: newAttendee.id,
          import_status: 'approved',
          import_reviewed: true,
          processing_errors: [],
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRecordId)

      return {
        success: true,
        attendeeId: newAttendee.id,
        spouseId,
        errors: []
      }

    } catch (error) {
      console.error('Error approving and importing:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Reject a record
  static async rejectRecord(rawRecordId: string, reason?: string): Promise<boolean> {
    try {
      await supabase
        .from('raw_attendee_data_idloom')
        .update({
          import_status: 'rejected',
          import_reviewed: true,
          processing_errors: reason ? [reason] : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', rawRecordId)

      return true
    } catch (error) {
      console.error('Error rejecting record:', error)
      return false
    }
  }

  // Get transformation statistics
  static async getTransformationStats(): Promise<{
    pending: number
    approved: number
    rejected: number
    failed: number
    total: number
  }> {
    try {
      const { data, error } = await supabase
        .from('raw_attendee_data_idloom')
        .select('import_status')

      if (error) throw error

      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        failed: 0,
        total: data?.length || 0
      }

      data?.forEach(record => {
        switch (record.import_status) {
          case 'pending': stats.pending++; break
          case 'approved': stats.approved++; break
          case 'rejected': stats.rejected++; break
          case 'failed': stats.failed++; break
        }
      })

      return stats
    } catch (error) {
      throw new Error(`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}