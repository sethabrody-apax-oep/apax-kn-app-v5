import React, { useState } from 'react'
import { Plus, Edit, Trash2, Save, X, Clock, MapPin, Users, Grid3X3 } from 'lucide-react'
import { useAgendaItems } from '../../hooks/useSupabaseData'
import { supabase } from '../../lib/supabase'
import AgendaBulkUpload from './AgendaBulkUpload'
import AgendaDocumentUpload from './AgendaDocumentUpload'
import SpeakerSelector from './SpeakerSelector'

interface AgendaItem {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  location: string
  type: string
  speakers?: any[]
  capacity?: number
  seating_type?: string
  is_active: boolean
}

export default function AgendaManagement() {
  const { agendaItems, loading, error, createAgendaItem, updateAgendaItem, deleteAgendaItem, refreshAgendaItems } = useAgendaItems()
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    type: 'breakout',
    capacity: '',
    seating_type: 'open',
    is_active: true
  })

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const saveData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        type: formData.type,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        seating_type: formData.seating_type,
        is_active: formData.is_active
      }
      
      if (selectedItem) {
        await updateAgendaItem(selectedItem.id, saveData, selectedSpeakerIds)
      } else {
        await createAgendaItem(saveData, selectedSpeakerIds)
      }
      
      setShowForm(false)
      setSelectedItem(null)
      setSelectedSpeakerIds([])
      resetForm()
    } catch (error) {
      console.error('Error saving agenda item:', error)
      alert('Failed to save agenda item. Please try again.')
    }
  }

  const handleEditItem = (item: AgendaItem) => {
    setSelectedItem(item)
    setSelectedSpeakerIds((item.speakers || []).map(speaker => speaker.id))
    setFormData({
      title: item.title,
      description: item.description,
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      type: item.type,
      capacity: item.capacity?.toString() || '',
      seating_type: item.seating_type || 'open',
      is_active: item.is_active
    })
    setShowForm(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this agenda item?')) {
      try {
        await deleteAgendaItem(id)
      } catch (error) {
        console.error('Error deleting agenda item:', error)
        alert('Failed to delete agenda item. Please try again.')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      type: 'breakout',
      capacity: '',
      seating_type: 'open',
      is_active: true
    })
    setSelectedSpeakerIds([])
  }

  const handleBulkUpload = async (uploadedItems: any[]) => {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .insert(uploadedItems)
      
      if (error) throw error
      await refreshAgendaItems()
      setShowBulkUpload(false)
    } catch (error) {
      console.error('Error bulk uploading agenda items:', error)
      alert('Failed to upload agenda items. Please try again.')
    }
  }

  const handleDocumentUpload = async (extractedItems: any[]) => {
    try {
      const { error } = await supabase
        .from('agenda_items')
        .insert(extractedItems)
      
      if (error) throw error
      await refreshAgendaItems()
      setShowDocumentUpload(false)
    } catch (error) {
      console.error('Error uploading extracted agenda items:', error)
      alert('Failed to upload extracted agenda items. Please try again.')
    }
  }

  if (showBulkUpload) {
    return (
      <AgendaBulkUpload
        onUpload={handleBulkUpload}
        onCancel={() => setShowBulkUpload(false)}
      />
    )
  }

  if (showDocumentUpload) {
    return (
      <AgendaDocumentUpload
        onExtract={handleDocumentUpload}
        onCancel={() => setShowDocumentUpload(false)}
      />
    )
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy mb-2">
              {selectedItem ? 'Edit Agenda Item' : 'Add New Agenda Item'}
            </h1>
            <p className="text-brand-gray">
              {selectedItem ? 'Update agenda item information' : 'Add a new session to the conference agenda'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(false)
              setSelectedItem(null)
              resetForm()
            }}
            className="p-2 text-brand-gray hover:text-brand-navy"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSaveItem} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Session Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Session Title *
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
                  Session Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                >
                  <option value="keynote">Keynote</option>
                  <option value="breakout">Breakout Session</option>
                  <option value="executive-presentation">Executive Presentation</option>
                  <option value="panel">Panel Discussion</option>
                  <option value="meal">Meal</option>
                  <option value="reception">Reception</option>
                  <option value="networking">Networking</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
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
                  placeholder="e.g., Main Auditorium, Conference Room A"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                  placeholder="Maximum attendees"
                  min="1"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
                  placeholder="Session description..."
                />
              </div>
            </div>
          </div>

          {/* Speaker Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Speaker Assignment
            </h3>
            
            <SpeakerSelector
              selectedSpeakerIds={selectedSpeakerIds}
              onSelectionChange={setSelectedSpeakerIds}
              placeholder="Search attendees to assign as speakers..."
            />
          </div>
          {/* Seating Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-brand-navy mb-4">
              Seating Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Seating Type *
                </label>
                <select
                  value={formData.seating_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, seating_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  <option value="open">Open Seating</option>
                  <option value="assigned">Assigned Seating</option>
                </select>
                <p className="text-xs text-brand-gray mt-1">
                  Assigned seating events will appear in Seating Management
                </p>
              </div>
              
              {formData.seating_type === 'assigned' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Assigned Seating:</strong> Seating layouts and assignments will be configured in the Seating Management section after saving this agenda item.
                  </p>
                </div>
              )}
            </div>
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
              Active (visible to attendees)
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setSelectedItem(null)
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
              {selectedItem ? 'Update Item' : 'Save Item'}
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
            Agenda Management
          </h1>
          <p className="text-brand-gray">
            Manage conference sessions and schedule
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Speakers
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">
                  Seating
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
              {agendaItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-brand-navy">
                      {item.title}
                    </div>
                    <div className="text-xs text-brand-gray">
                      {item.description}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-brand-gray flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.start_time} - {item.end_time}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {item.location}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.type === 'keynote' ? 'bg-sector-services/20 text-sector-services' :
                      item.type === 'breakout' ? 'bg-chart-green/20 text-green-800' :
                      item.type === 'meal' ? 'bg-sector-tech/20 text-orange-800' :
                      item.type === 'reception' ? 'bg-light-purple/20 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.type === 'executive-presentation' ? 'Executive Presentation' :
                       item.type === 'keynote' ? 'Keynote' :
                       item.type === 'breakout' ? 'Breakout' :
                       item.type === 'panel' ? 'Panel' :
                       item.type === 'meal' ? 'Meal' :
                       item.type === 'reception' ? 'Reception' :
                       item.type === 'networking' ? 'Networking' :
                       item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {(item.speakers || []).length > 0 ? (
                        (item.speakers || []).map((speaker, index) => (
                          <div key={speaker.id} className="flex items-center space-x-2">
                            <img
                              src={speaker.photo || '/Apax_Favicon_32x32-1 copy.png'}
                              alt={`${speaker.first_name} ${speaker.last_name}`}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div className="text-xs">
                              <div className="font-semibold text-brand-navy">
                                {speaker.first_name} {speaker.last_name}
                              </div>
                              <div className="text-brand-gray">
                                {speaker.company}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-brand-gray">No speakers assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-brand-gray flex items-center">
                      {item.capacity ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          {item.capacity}
                        </>
                      ) : (
                        'Unlimited'
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.seating_type === 'assigned'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.seating_type === 'assigned' ? 'Assigned' : 'Open'}
                      </span>
                      {item.seating_type === 'assigned' && (
                        <Grid3X3 className="w-3 h-3 text-blue-600" title="Seating management available" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1 text-brand-gray hover:text-brand-navy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
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

        {agendaItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-brand-gray">No agenda items configured yet.</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-brand-gray">
        Showing {agendaItems.length} agenda item(s)
      </div>
    </div>
  )
}