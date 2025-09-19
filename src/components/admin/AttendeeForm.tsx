import React, { useState, useEffect } from 'react'
import { Save, X, User, Building, Calendar, MapPin, Phone, Users, Utensils, Upload, Hotel } from 'lucide-react'
import { useDiningOptions, useAgendaItems, useHotels } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'

interface AttendeeFormProps {
  attendee?: any
  onSave: (attendeeData: any) => void
  onCancel: () => void
}

export default function AttendeeForm({ attendee, onSave, onCancel }: AttendeeFormProps) {
  const { diningOptions } = useDiningOptions()
  const { agendaItems } = useAgendaItems()
  
  const { hotels } = useHotels()

  // Helper function to convert breakout session titles to slugs as stored in selected_breakouts
  const getBreakoutSlug = (title: string): string => {
    // Map specific titles to their exact slugs as stored in the database
    const titleToSlugMap: { [key: string]: string } = {
      'Track A: Driving Revenue Growth in the Age of AI': 'track-a-revenue-growth',
      'Track B: Driving Operational Performance in the Age of AI': 'track-b-operational-performance',
      'Apax Software CEO Summit - by invitation only': 'apax-software-ceo-summit'
    }
    
    // Return exact match if found
    if (titleToSlugMap[title]) {
      return titleToSlugMap[title]
    }
    
    // Fallback: generate slug from title
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('')
  const [hasCustomPhoto, setHasCustomPhoto] = useState(false)
  
  const [formData, setFormData] = useState({
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    company: '',
    bio: '',
    photo: '/Apax_Favicon_32x32-1 copy.png',
    dietary_requirements: '',
    business_phone: '',
    mobile_phone: '',
    assistant_name: '',
    assistant_email: '',
    address1: '',
    address2: '',
    postal_code: '',
    city: '',
    state: '',
    country: '',
    country_code: '',
    checkInDate: '2025-03-15',
    checkOutDate: '2025-03-17',
    hotelSelection: 'grand-hotel',
    customHotel: '',
    registrationId: '',
    has_spouse: false,
    spouse_details: {},
    dining_selections: {},
    selected_breakouts: [],
    registrationStatus: 'confirmed',
    accessCode: '',
    attributes: {
      apaxIP: false,
      apaxEP: false,
      apaxOEP: false,
      apaxOther: false,
      portfolioCompanyExecutive: false,
      sponsorAttendee: false,
      speaker: false,
      spouse: false,
      ceo: false,
      cfo: false,
      cmo: false,
      cro: false,
      coo: false,
      chro: false,
      cto_cio: false,
      cLevelExec: false,
      nonCLevelExec: false,
      otherAttendeeType: false,
    }
  })

  useEffect(() => {
    if (attendee) {
      // Check if attendee has a custom uploaded photo
      const isCustomPhoto = attendee.photo && 
        !attendee.photo.includes('pexels.com') && 
        !attendee.photo.includes('images.unsplash.com') &&
        attendee.photo !== 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' &&
        attendee.photo !== '/Apax_Favicon_32x32.png' &&
        attendee.photo !== '/Apax_Favicon_32x32-1.png'
      
      setHasCustomPhoto(isCustomPhoto)
      
      // Replace old default images with new default
      let photoUrl = attendee.photo || '/Apax_Favicon_32x32-1 copy.png'
      if (photoUrl === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' ||
          photoUrl === '/Apax_Favicon_32x32.png' ||
          photoUrl === '/Apax_Favicon_32x32-1.png') {
        photoUrl = '/Apax_Favicon_32x32-1 copy.png'
      }
      
      setPhotoPreviewUrl(photoUrl)
      
      setFormData({
        salutation: attendee.salutation || '',
        firstName: attendee.firstName || attendee.first_name || '',
        lastName: attendee.lastName || attendee.last_name || '',
        email: attendee.email || '',
        title: attendee.title || '',
        company: attendee.company || '',
        bio: attendee.bio || '',
        photo: photoUrl,
        dietary_requirements: attendee.dietary_requirements || '',
        business_phone: attendee.business_phone || attendee.businessPhone || '',
        mobile_phone: attendee.mobile_phone || attendee.mobilePhone || '',
        assistant_name: attendee.assistant_name || attendee.assistantName || '',
        assistant_email: attendee.assistant_email || attendee.assistantEmail || '',
        address1: attendee.address1 || '',
        address2: attendee.address2 || '',
        postal_code: attendee.postal_code || attendee.postalCode || '',
        city: attendee.city || '',
        state: attendee.state || '',
        country: attendee.country || '',
        country_code: attendee.country_code || attendee.countryCode || '',
        checkInDate: attendee.checkInDate || attendee.check_in_date || '2025-03-15',
        checkOutDate: attendee.checkOutDate || attendee.check_out_date || '2025-03-17',
        hotelSelection: attendee.hotelSelection || attendee.hotel_selection || 'grand-hotel',
        customHotel: attendee.customHotel || attendee.custom_hotel || '',
        registrationId: attendee.registrationId || attendee.registration_id || '',
        has_spouse: attendee.has_spouse || attendee.hasSpouse || false,
        spouse_details: attendee.spouse_details || attendee.spouseDetails || {},
        dining_selections: attendee.dining_selections || attendee.diningSelections || {},
        selected_breakouts: attendee.selected_breakouts || attendee.selectedBreakouts || [],
        registrationStatus: attendee.registrationStatus || attendee.registration_status || 'confirmed',
        accessCode: attendee.accessCode || attendee.access_code || '',
        attributes: {
          apaxIP: attendee.attributes?.apaxIP || false,
          apaxEP: attendee.attributes?.apaxEP || attendee.is_apax_ep || false,
          apaxOEP: attendee.attributes?.apaxOEP || false,
          apaxOther: attendee.attributes?.apaxOther || false,
          portfolioCompanyExecutive: attendee.attributes?.portfolioCompanyExecutive || false,
          sponsorAttendee: attendee.attributes?.sponsorAttendee || false,
          speaker: attendee.attributes?.speaker || false,
          spouse: attendee.attributes?.spouse || attendee.is_spouse || false,
          ceo: attendee.attributes?.ceo || false,
          cfo: attendee.attributes?.cfo || attendee.is_cfo || false,
          cmo: attendee.attributes?.cmo || false,
          cro: attendee.attributes?.cro || false,
          coo: attendee.attributes?.coo || false,
          chro: attendee.attributes?.chro || false,
          cto_cio: attendee.attributes?.cto_cio || false,
          cLevelExec: attendee.attributes?.cLevelExec || false,
          nonCLevelExec: attendee.attributes?.nonCLevelExec || false,
          otherAttendeeType: attendee.attributes?.otherAttendeeType || false,
          fundAffiliation: Array.isArray(attendee.attributes?.fundAffiliation)
            ? attendee.attributes.fundAffiliation
            : (attendee.attributes?.fundAffiliation ? [attendee.attributes.fundAffiliation] : [])
        }
      })
    }
  }, [attendee])

  const uploadPhotoToSupabase = async (file: File, attendeeId?: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Use attendee ID for stable file path, or generate temp ID for new attendees
      const fileId = attendeeId || `temp-${Date.now()}`
      const filePath = `${user.id}/${fileId}.jpg`

      const { data, error } = await supabase.storage
        .from('attendee-headshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // This will replace existing files with the same path
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('attendee-headshots')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw error
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file must be less than 5MB')
      return
    }

    setIsUploadingPhoto(true)

    try {
      const photoUrl = await uploadPhotoToSupabase(file, attendee?.id)
      setFormData(prev => ({ ...prev, photo: photoUrl }))
      setPhotoPreviewUrl(photoUrl)
      setHasCustomPhoto(true)
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            {attendee ? 'Edit Attendee' : 'Add New Attendee'}
          </h1>
          <p className="text-brand-gray">
            {attendee ? 'Update attendee information' : 'Add a new conference attendee'}
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
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Salutation
              </label>
              <input
                type="text"
                value={formData.salutation}
                onChange={(e) => setFormData(prev => ({ ...prev, salutation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                placeholder="Mr, Ms, Dr, etc."
              />
            </div>
            
            <div></div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Company *
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Biography
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
                placeholder="Enter attendee biography..."
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Photo URL
              </label>
              <input
                type="url"
                value={formData.photo}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, photo: e.target.value }))
                  setPhotoPreviewUrl(e.target.value)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                placeholder="Enter photo URL or upload a file below"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Upload Photo
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={isUploadingPhoto}
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </label>
                {hasCustomPhoto && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ Custom photo uploaded
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-gray mt-1">
                Upload a headshot photo (JPEG, PNG, GIF, WebP) up to 5MB
              </p>
              
              {photoPreviewUrl && (
                <div className="mt-3">
                  <img
                    src={photoPreviewUrl}
                    alt="Photo preview"
                    className="h-20 w-20 object-cover rounded-full border-2 border-gray-200"
                    onError={(e) => {
                      e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Dietary Requirements
              </label>
              <input
                type="text"
                value={formData.dietary_requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, dietary_requirements: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                placeholder="e.g., Vegetarian, Gluten-free, No seafood"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Business Phone
              </label>
              <input
                type="tel"
                value={formData.business_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, business_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Mobile Phone
              </label>
              <input
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile_phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Assistant Name
              </label>
              <input
                type="text"
                value={formData.assistant_name}
                onChange={(e) => setFormData(prev => ({ ...prev, assistant_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Assistant Email
              </label>
              <input
                type="email"
                value={formData.assistant_email}
                onChange={(e) => setFormData(prev => ({ ...prev, assistant_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Address Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.address1}
                onChange={(e) => setFormData(prev => ({ ...prev, address1: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address2}
                onChange={(e) => setFormData(prev => ({ ...prev, address2: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Country Code
              </label>
              <input
                type="text"
                value={formData.country_code}
                onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                placeholder="e.g., US, UK, FR"
              />
            </div>
          </div>
        </div>

        {/* Hotel & Travel Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Hotel className="w-5 h-5 mr-2" />
            Hotel & Travel Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Check-in Date
              </label>
              <input
                type="date"
                value={formData.checkInDate}
                onChange={(e) => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Check-out Date
              </label>
              <input
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => setFormData(prev => ({ ...prev, checkOutDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Hotel Selection
              </label>
              <select
                value={formData.hotelSelection}
                onChange={(e) => setFormData(prev => ({ ...prev, hotelSelection: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              >
                <option value="grand-hotel">Grand Hotel</option>
                <option value="business-center">Business Center Hotel</option>
                <option value="luxury-suites">Luxury Suites</option>
                <option value="custom">Making Own Arrangements</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>
            
            {formData.hotelSelection === 'custom' && (
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Custom Hotel Details
                </label>
                <input
                  type="text"
                  value={formData.customHotel}
                  onChange={(e) => setFormData(prev => ({ ...prev, customHotel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="Enter custom hotel name and details"
                />
              </div>
            )}
          </div>
        </div>

        {/* Dining & Breakout Selections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Utensils className="w-5 h-5 mr-2" />
            Dining & Breakout Selections
          </h3>
          
          <div className="mb-4">
            {diningOptions.length > 0 ? (
              diningOptions.map(option => {
                // Find matching dining selection in attendee data
                const findMatchingDiningKey = (optionName: string, diningSelections: any) => {
                  if (!diningSelections || typeof diningSelections !== 'object') return null
                  
                  // Try exact key match first
                  const keys = Object.keys(diningSelections)
                  
                  // Generate possible keys for this dining option
                  const possibleKeys = [
                    option.id,
                    optionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'),
                    optionName.toLowerCase().replace(/\s+/g, '-'),
                    optionName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
                  ]
                  
                  // Try exact matches first
                  for (const key of possibleKeys) {
                    if (keys.includes(key)) {
                      return key
                    }
                  }
                  
                  // Try partial matches
                  const optionWords = optionName.toLowerCase().split(/\s+/)
                  for (const key of keys) {
                    const keyWords = key.toLowerCase().split(/[-_\s]+/)
                    const matchCount = optionWords.filter(word => 
                      keyWords.some(keyWord => keyWord.includes(word) || word.includes(keyWord))
                    ).length
                    
                    if (matchCount >= Math.min(2, optionWords.length)) {
                      return key
                    }
                  }
                  
                  return null
                }
                
                const matchingKey = findMatchingDiningKey(option.name, attendee?.diningSelections || attendee?.dining_selections)
                const diningSelection = matchingKey ? (attendee?.diningSelections || attendee?.dining_selections)[matchingKey] : null
                const isAttending = diningSelection?.attending === true
                
                return (
                  <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{option.name}</p>
                      <p className="text-xs text-brand-gray">{new Date(option.date).toLocaleDateString()} • {option.time} • {option.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          dining_selections: {
                            ...prev.dining_selections,
                            [option.id]: {
                              ...prev.dining_selections?.[option.id],
                              attending: !isAttending,
                            },
                          },
                        }))
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        isAttending
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      {isAttending ? 'Will Attend' : 'Not Attending'}
                    </button>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-brand-gray">No dining options available.</p>
            )}
          </div>
          
          <div className="mb-4">
            <h4 className="text-md font-semibold text-brand-navy mb-2">Breakout Sessions</h4>
            {agendaItems.filter(item => item.type === 'breakout').length > 0 ? (
              agendaItems.filter(item => item.type === 'breakout').map(item => {
                const sessionSlug = getBreakoutSlug(item.title)
                const isSelected = formData.selected_breakouts.includes(sessionSlug)
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mb-2">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{item.title}</p>
                      <p className="text-xs text-brand-gray">{new Date(item.date).toLocaleDateString()} • {item.start_time} - {item.end_time} • {item.location}</p>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setFormData(prev => {
                            const currentSelections = [...prev.selected_breakouts]
                            const sessionSlug = getBreakoutSlug(item.title)
                            if (e.target.checked) {
                              if (!currentSelections.includes(sessionSlug)) {
                                currentSelections.push(sessionSlug)
                              }
                            } else {
                              const index = currentSelections.indexOf(sessionSlug)
                              if (index > -1) {
                                currentSelections.splice(index, 1)
                              }
                            }
                            return { ...prev, selected_breakouts: currentSelections }
                          })
                        }}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                      />
                      <span className="text-sm text-brand-navy">{isSelected ? 'Selected' : 'Select'}</span>
                    </label>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-brand-gray">No breakout sessions available.</p>
            )}
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p>
              <strong>Note:</strong> Dining and breakout selections are managed through the IDLoom registration system. Changes to these selections should be made in IDLoom and will sync automatically.
            </p>
          </div>
        </div>

        {/* Attendee Attributes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Attendee Attributes
          </h3>
          
          {/* Apax Attendee Attributes */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-brand-navy mb-3">Apax Attendee Attributes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.apaxIP}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, apaxIP: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Apax IP</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.apaxOther}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, apaxOther: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Apax Other</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.apaxEP}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, apaxEP: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Apax EP</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.apaxOEP}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, apaxOEP: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Apax OEP</span>
              </label>
            </div>
          </div>

          {/* Non-Apax Attendee Attributes */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-brand-navy mb-3">Non-Apax Attendee Attributes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.portfolioCompanyExecutive}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, portfolioCompanyExecutive: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Portfolio Company Exec</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.sponsorAttendee}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, sponsorAttendee: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Sponsor / Vendor Attendee</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.speaker}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, speaker: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Speaker or Executive Presenter</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.otherAttendeeType}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, otherAttendeeType: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Other Attendee Type</span>
              </label>
            </div>
          </div>

          {/* Role Information */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-brand-navy mb-3">Role Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.ceo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, ceo: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CEO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.cfo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, cfo: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CFO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.cmo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, cmo: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CMO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.cro}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, cro: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CRO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.coo}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, coo: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">COO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.chro}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, chro: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CHRO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.cto_cio}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, cto_cio: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">CTO/CIO</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.cLevelExec}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, cLevelExec: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Other C-Level Exec</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.attributes.nonCLevelExec}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    attributes: { ...prev.attributes, nonCLevelExec: e.target.checked }
                  }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <span className="text-sm text-brand-navy">Non C-Level Exec</span>
              </label>
            </div>
          </div>

          {/* Fund Affiliation */}
          <div className="mb-4">
          </div>
        </div>

        {/* Spouse/Partner Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Spouse/Partner Information
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.has_spouse}
                onChange={(e) => setFormData(prev => ({ ...prev, has_spouse: e.target.checked }))}
                className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
              />
              <span className="text-sm font-semibold text-brand-navy">
                Attendee has spouse/partner attending
              </span>
            </label>
          </div>
          
          {formData.has_spouse && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Spouse First Name
                </label>
                <input
                  type="text"
                  value={formData.spouse_details?.firstName || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spouse_details: { ...prev.spouse_details, firstName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Spouse Last Name
                </label>
                <input
                  type="text"
                  value={formData.spouse_details?.lastName || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spouse_details: { ...prev.spouse_details, lastName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Spouse Email
                </label>
                <input
                  type="email"
                  value={formData.spouse_details?.email || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spouse_details: { ...prev.spouse_details, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Spouse Mobile Phone
                </label>
                <input
                  type="tel"
                  value={formData.spouse_details?.mobilePhone || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spouse_details: { ...prev.spouse_details, mobilePhone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Spouse Dietary Requirements
                </label>
                <input
                  type="text"
                  value={formData.spouse_details?.dietaryRequirements || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    spouse_details: { ...prev.spouse_details, dietaryRequirements: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Registration Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Registration Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Registration ID
              </label>
              <input
                type="text"
                value={formData.registrationId}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Registration Status
              </label>
              <select
                value={formData.registrationStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Access Code
              </label>
              <input
                type="text"
                value={formData.accessCode}
                onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
          </div>
        </div>

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
            {attendee ? 'Update Attendee' : 'Save Attendee'}
          </button>
        </div>
      </form>
    </div>
  )
}