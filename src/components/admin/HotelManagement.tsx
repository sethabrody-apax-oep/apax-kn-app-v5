import React, { useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useHotels } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'

interface Hotel {
  id: string
  name: string
  address: string
  phone: string
  website?: string
  isActive: boolean
  displayOrder: number
}

export default function HotelManagement() {
  const { hotels, loading, error, refreshHotels } = useHotels()
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    isActive: true,
    displayOrder: 1
  })

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (selectedHotel) {
        // Update existing hotel
        const { error } = await supabase
          .from('hotels')
          .update({
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            website: formData.website || null,
            is_active: formData.isActive,
            display_order: formData.displayOrder
          })
          .eq('id', selectedHotel.id)
        
        if (error) throw error
      } else {
        // Create new hotel
        const { error } = await supabase
          .from('hotels')
          .insert([{
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            website: formData.website || null,
            is_active: formData.isActive,
            display_order: formData.displayOrder
          }])
        
        if (error) throw error
      }
      
      await refreshHotels()
      setShowForm(false)
      setSelectedHotel(null)
      resetForm()
    } catch (error) {
      console.error('Error saving hotel:', error)
      alert('Failed to save hotel. Please try again.')
    }
  }

  const handleEditHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel)
    setFormData({
      name: hotel.name,
      address: hotel.address,
      phone: hotel.phone,
      website: hotel.website || '',
      isActive: hotel.is_active,
      displayOrder: hotel.display_order
    })
    setShowForm(true)
  }

  const handleDeleteHotel = async (id: string) => {
    if (confirm('Are you sure you want to delete this hotel?')) {
      try {
        const { error } = await supabase
          .from('hotels')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        await refreshHotels()
      } catch (error) {
        console.error('Error deleting hotel:', error)
        alert('Failed to delete hotel. Please try again.')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      website: '',
      isActive: true,
      displayOrder: (hotels?.length || 0) + 1
    })
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              {selectedHotel ? 'Edit Hotel' : 'Add New Hotel'}
            </h1>
            <p className="text-brand-gray">
              {selectedHotel ? 'Update hotel information' : 'Add a new hotel option for attendees'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(false)
              setSelectedHotel(null)
              resetForm()
            }}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSaveHotel} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Hotel Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="https://hotel-website.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Display Order *
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm font-semibold text-brand-navy">
                  Active (available for selection)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setSelectedHotel(null)
                resetForm()
              }}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {selectedHotel ? 'Update Hotel' : 'Save Hotel'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Hotel Management
          </h1>
          <p className="text-brand-gray">
            Manage hotel options available for attendee selection
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Hotel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Hotel Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Order
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
              {hotels.sort((a, b) => a.displayOrder - b.displayOrder).map((hotel) => (
                <tr key={hotel.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-brand-navy">
                      {hotel.name}
                    </div>
                    {hotel.website && (
                      <a
                        href={hotel.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sector-services hover:underline"
                      >
                        {hotel.website}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray">
                      {hotel.address}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray">
                      {hotel.phone}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-brand-navy font-mono">
                      {hotel.display_order}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      hotel.is_active
                        ? 'bg-chart-green/20 text-green-800'
                        : 'bg-chart-red/20 text-red-800'
                    }`}>
                      {hotel.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditHotel(hotel)}
                        className="p-1 text-brand-gray hover:text-brand-navy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHotel(hotel.id)}
                        className="p-1 text-brand-gray hover:text-red-600"
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

        {hotels.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-brand-gray">No hotels configured yet.</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-brand-gray">
        Showing {hotels.length} hotel(s)
      </div>
    </div>
  )
}