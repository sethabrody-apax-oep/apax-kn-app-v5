import React, { useState } from 'react'
import { Plus, Edit, Trash2, Save, X, Eye, Users, MapPin, CheckCircle, AlertCircle } from 'lucide-react'
import { useDiningOptions, useAttendees } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'
import TableViewModal from './TableViewModal'

interface DiningOption {
  id: string
  name: string
  date: string
  time: string
  location: string
  address: string
  address_validated: boolean
  has_table_assignments: boolean
  tables: { name: string; capacity: number }[]
  is_active: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export default function DiningManagement() {
  const { diningOptions, loading, error, refreshDiningOptions } = useDiningOptions()
  const { attendees } = useAttendees()
  const [selectedOption, setSelectedOption] = useState<DiningOption | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState<{ optionId: string; tableName: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    address: '',
    address_validated: false,
    seating_type: 'open' as 'open' | 'assigned',
    capacity: '',
    is_active: true,
    display_order: 1
  })

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError('')
    
    try {
      console.log('Saving dining option with data:', formData)
      
      const saveData = {
        name: formData.name,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        address: formData.address,
        address_validated: formData.address_validated,
        seating_type: formData.seating_type,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        has_table_assignments: formData.seating_type === 'assigned',
        tables: formData.seating_type === 'assigned' ? [] : [{ name: 'Not Applicable', capacity: 0 }],
        is_active: formData.is_active,
        display_order: formData.display_order
      }
      
      if (selectedOption) {
        console.log('Updating dining option:', selectedOption.id, saveData)
        const { error } = await supabase
          .from('dining_options')
          .update(saveData)
          .eq('id', selectedOption.id)
        
        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
      } else {
        console.log('Creating new dining option:', saveData)
        const { error } = await supabase
          .from('dining_options')
          .insert([saveData])
        
        if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
      }
      
      console.log('Save successful, refreshing data...')
      await refreshDiningOptions()
      setShowForm(false)
      setSelectedOption(null)
      resetForm()
      
    } catch (error) {
      console.error('Error saving dining option:', error)
      setSaveError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditOption = (option: DiningOption) => {
    console.log('Editing dining option:', option)
    setSelectedOption(option)
    setFormData({
      name: option.name,
      date: option.date,
      time: option.time,
      location: option.location,
      address: option.address,
      address_validated: option.address_validated,
      seating_type: option.seating_type || (option.has_table_assignments ? 'assigned' : 'open'),
      capacity: option.capacity?.toString() || '',
      is_active: option.is_active,
      display_order: option.display_order
    })
    setShowForm(true)
  }

  const handleDeleteOption = async (id: string) => {
    if (confirm('Are you sure you want to delete this dining option?')) {
      try {
        const { error } = await supabase
          .from('dining_options')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        await refreshDiningOptions()
      } catch (error) {
        console.error('Error deleting dining option:', error)
        alert('Failed to delete dining option. Please try again.')
      }
    }
  }

  const handleViewTable = (optionId: string, tableName: string) => {
    setSelectedTable({ optionId, tableName })
    setShowTableModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      time: '',
      location: '',
      address: '',
      address_validated: false,
      seating_type: 'open',
      capacity: '',
      is_active: true,
      display_order: (diningOptions?.length || 0) + 1
    })
    setSaveError('')
  }

  // Get actual table occupancy from attendee data
  const getTableOccupancy = (optionId: string, tableName: string) => {
    const diningOption = diningOptions.find(option => option.id === optionId)
    
    if (!diningOption) return 0
    
    // Create multiple possible keys to match against attendee data
    const possibleKeys = [
      diningOption.id,
      diningOption.name.toLowerCase().replace(/\s+/g, '-'),
      diningOption.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    ]
    
    let totalCount = 0
    
    attendees.forEach((attendee: any) => {
      if (!attendee.dining_selections) return
      
      // Check all possible keys to find matching dining selection
      for (const key of possibleKeys) {
        const diningSelection = attendee.dining_selections[key]
        if (diningSelection) {
          // Count main attendee
          if (diningSelection.attending && diningSelection.tableNumber === tableName) {
            totalCount++
          }
          // Count spouse if applicable
          if (attendee.has_spouse && diningSelection.spouseAttending && diningSelection.spouseTableNumber === tableName) {
            totalCount++
          }
          break // Found a match, no need to check other keys
        }
      }
    })
    
    return totalCount
  }

  // Get total attendees for an option
  const getTotalAttendees = (optionId: string) => {
    const diningOption = diningOptions.find(option => option.id === optionId)
    
    if (!diningOption) return 0
    
    // Create multiple possible keys to match against attendee data
    const possibleKeys = [
      diningOption.id,
      diningOption.name.toLowerCase().replace(/\s+/g, '-'),
      diningOption.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    ]
    
    let totalCount = 0
    
    attendees.forEach((attendee: any) => {
      if (!attendee.dining_selections) return
      
      // Check all possible keys to find matching dining selection
      for (const key of possibleKeys) {
        const diningSelection = attendee.dining_selections[key]
        if (diningSelection) {
          // Count main attendee
          if (diningSelection.attending) {
            totalCount++
          }
          // Count spouse if applicable
          if (attendee.has_spouse && diningSelection.spouseAttending) {
            totalCount++
          }
          break // Found a match, no need to check other keys
        }
      }
    })
    
    return totalCount
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              {selectedOption ? 'Edit Dining Option' : 'Add New Dining Option'}
            </h1>
            <p className="text-brand-gray">
              {selectedOption ? 'Update dining option information' : 'Add a new meal or reception option'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(false)
              setSelectedOption(null)
              resetForm()
            }}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {saveError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                Save Error: {saveError}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveOption} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Event Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Event Name *
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
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="e.g., Grand Ballroom, Conference Room A"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Venue Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="Enter complete venue address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Display Order *
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Maximum Capacity (Optional)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  min="1"
                  placeholder="Enter maximum attendees"
                />
                <p className="text-xs text-brand-gray mt-1">
                  Maximum number of attendees for this event
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-semibold text-brand-navy">
                  Active (available for selection)
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Seating Configuration
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-brand-navy mb-2">
                Seating Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="seating_type"
                    value="open"
                    checked={formData.seating_type === 'open'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      seating_type: e.target.value as 'open' | 'assigned'
                    }))}
                    className="w-4 h-4 text-brand-navy focus:ring-brand-navy"
                  />
                  <div>
                    <span className="text-sm font-semibold text-brand-navy">Open Seating</span>
                    <p className="text-xs text-brand-gray">Guests can sit anywhere</p>
                  </div>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="seating_type"
                    value="assigned"
                    checked={formData.seating_type === 'assigned'}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      seating_type: e.target.value as 'open' | 'assigned'
                    }))}
                    className="w-4 h-4 text-brand-navy focus:ring-brand-navy"
                  />
                  <div>
                    <span className="text-sm font-semibold text-brand-navy">Assigned Seating</span>
                    <p className="text-xs text-brand-gray">Specific seat assignments managed in Seating Management</p>
                  </div>
                </label>
              </div>
            </div>
            
            {formData.seating_type === 'assigned' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Assigned Seating:</strong> Table layouts and seat assignments will be configured in the Seating Management section after saving this dining option.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pb-8">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setSelectedOption(null)
                resetForm()
              }}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : (selectedOption ? 'Update Option' : 'Save Option')}
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
            Dining & Reception Management
          </h1>
          <p className="text-brand-gray">
            Manage meals and reception options with table assignments
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
          Add Dining Option
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Location & Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Seating Arrangement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Capacity
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
              {diningOptions
                .sort((a, b) => a.display_order - b.display_order)
                .map((option) => (
                <tr key={option.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-brand-navy">
                      {option.name}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray">
                      {new Date(option.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-brand-gray">
                      {option.time}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray">
                      {option.location}
                    </div>
                    <div className="text-xs text-brand-gray flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {option.address}
                      {option.address_validated && (
                        <CheckCircle className="w-3 h-3 ml-1 text-green-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      option.seating_type === 'assigned' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {option.seating_type === 'assigned' ? 'Assigned Seating' : 'Open Seating'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-navy">
                      {option.capacity ? (
                        <>
                          <Users className="w-3 h-3 inline mr-1" />
                          {option.capacity}
                        </>
                      ) : (
                        <span className="text-brand-gray">Unlimited</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      option.is_active
                        ? 'bg-chart-green/20 text-green-800'
                        : 'bg-chart-red/20 text-red-800'
                    }`}>
                      {option.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditOption(option)}
                        className="p-1 text-brand-gray hover:text-brand-navy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(option.id)}
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

        {diningOptions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brand-gray">No dining options configured yet.</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-brand-gray">
        Showing {diningOptions.length} dining option(s)
      </div>

      {showTableModal && selectedTable && (
        <TableViewModal
          optionId={selectedTable.optionId}
          tableName={selectedTable.tableName}
          onClose={() => {
            setShowTableModal(false)
            setSelectedTable(null)
          }}
        />
      )}
    </div>
  )
}