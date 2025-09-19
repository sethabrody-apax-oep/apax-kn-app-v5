import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Upload, Download, Building } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface BulkAliasManagerProps {
  company: any
  onSave: () => void // Callback to refresh parent data
  onCancel: () => void
}

export default function BulkAliasManager({ company, onSave, onCancel }: BulkAliasManagerProps) {
  const [existingAliases, setExistingAliases] = useState<any[]>([])
  const [newAliases, setNewAliases] = useState<string[]>([''])
  const [bulkText, setBulkText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadExistingAliases()
  }, [company.id])

  const loadExistingAliases = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('company_aliases')
        .select('*')
        .eq('standardized_company_id', company.id)
        .order('alias', { ascending: true })

      if (error) throw error
      setExistingAliases(data || [])
    } catch (error: any) {
      console.error('Error loading aliases:', error)
      setSaveError(`Failed to load aliases: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlias = async (aliasId: string) => {
    if (!confirm('Are you sure you want to delete this alias?')) return

    try {
      const { error } = await supabase
        .from('company_aliases')
        .delete()
        .eq('id', aliasId)

      if (error) throw error
      await loadExistingAliases()
      onSave() // Notify parent to refresh counts
    } catch (error: any) {
      console.error('Error deleting alias:', error)
      alert(`Failed to delete alias: ${error.message}`)
    }
  }

  const addNewAliasField = () => {
    setNewAliases(prev => [...prev, ''])
  }

  const updateNewAlias = (index: number, value: string) => {
    setNewAliases(prev => prev.map((alias, i) => i === index ? value : alias))
  }

  const removeNewAlias = (index: number) => {
    setNewAliases(prev => prev.filter((_, i) => i !== index))
  }

  const processBulkText = () => {
    if (!bulkText.trim()) return

    const lines = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => line.toLowerCase() !== company.name.toLowerCase()) // Don't add the company name itself as an alias

    setNewAliases(prev => {
      const combined = [...prev.filter(alias => alias.trim()), ...lines]
      return [...new Set(combined)] // Remove duplicates
    })
    setBulkText('')
  }

  const handleSaveNewAliases = async () => {
    setIsSaving(true)
    setSaveError(null)
    
    const aliasesToInsert = newAliases
      .filter(alias => alias.trim().length > 0)
      .filter(alias => alias.trim().toLowerCase() !== company.name.toLowerCase()) // Ensure company name is not added as alias

    if (aliasesToInsert.length === 0) {
      setSaveError('No valid new aliases to save.')
      setIsSaving(false)
      return
    }

    try {
      // Check for existing aliases to prevent duplicates
      const { data: existingAliasesCheck, error: checkError } = await supabase
        .from('company_aliases')
        .select('alias')
        .in('alias', aliasesToInsert.map(alias => alias.trim()))

      if (checkError) throw checkError

      const existingAliasNames = new Set(existingAliasesCheck?.map(item => item.alias) || [])
      const filteredAliases = aliasesToInsert
        .filter(alias => !existingAliasNames.has(alias.trim()))
        .map(alias => ({
          alias: alias.trim(),
          standardized_company_id: company.id
        }))

      if (filteredAliases.length === 0) {
        setSaveError('All aliases already exist in the database.')
        setIsSaving(false)
        return
      }

      const { error } = await supabase
        .from('company_aliases')
        .insert(filteredAliases)
        .select() // Select the inserted data to check for conflicts

      if (error) {
        throw error
      } else {
        setNewAliases(['']) // Clear new alias fields
        await loadExistingAliases() // Reload existing aliases
        onSave() // Notify parent to refresh counts
        
        if (filteredAliases.length < aliasesToInsert.length) {
          setSaveError(`${filteredAliases.length} aliases saved. ${aliasesToInsert.length - filteredAliases.length} duplicates were skipped.`)
        }
      }
    } catch (error: any) {
      console.error('Error saving new aliases:', error)
      setSaveError(`Failed to save aliases: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const exportAliases = () => {
    const csvContent = [
      ['Company Name', 'Alias'].join(','),
      ...existingAliases.map(alias => [company.name, alias.alias].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company.name.replace(/\s/g, '_')}_aliases.csv`
    a.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Manage Aliases: {company.name}
            </h2>
            <p className="text-brand-gray text-sm">
              Add alternative names and variations for this company
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {saveError}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Aliases */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-brand-navy">
                  Existing Aliases ({existingAliases.length})
                </h3>
                {existingAliases.length > 0 && (
                  <button
                    onClick={exportAliases}
                    className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
                </div>
              ) : existingAliases.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {existingAliases.map((alias) => (
                    <div key={alias.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-brand-navy">{alias.alias}</span>
                      <button
                        onClick={() => handleDeleteAlias(alias.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-brand-gray">
                  <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No aliases configured yet</p>
                </div>
              )}
            </div>

            {/* Add New Aliases */}
            <div>
              <h3 className="text-lg font-semibold text-brand-navy mb-4">
                Add New Aliases
              </h3>

              {/* Bulk Text Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  Bulk Add (One per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent resize-none"
                  placeholder="Microsoft Corporation&#10;Microsoft Inc&#10;Microsoft LLC&#10;MSFT"
                />
                <button
                  onClick={processBulkText}
                  disabled={!bulkText.trim()}
                  className="mt-2 inline-flex items-center px-3 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add from Text
                </button>
              </div>

              {/* Individual Alias Fields */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {newAliases.map((alias, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => updateNewAlias(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                      placeholder="Enter company alias..."
                    />
                    {newAliases.length > 1 && (
                      <button
                        onClick={() => removeNewAlias(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addNewAliasField}
                className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Another Alias
              </button>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Alias Management Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Add common variations: "Microsoft", "Microsoft Corp", "Microsoft Corporation"</li>
              <li>• Include abbreviations: "MSFT", "MS"</li>
              <li>• Add former names if the company was renamed</li>
              <li>• Include common misspellings that might appear in data imports</li>
              <li>• Aliases help automatically match attendee company names to standardized entries</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveNewAliases}
            disabled={isSaving || newAliases.every(alias => !alias.trim())}
            className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save New Aliases'}
          </button>
        </div>
      </div>
    </div>
  )
}