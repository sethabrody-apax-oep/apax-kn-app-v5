import React from 'react'
import { Save, RotateCcw, Download, Unlock } from 'lucide-react'

interface SeatingToolbarProps {
  isModified: boolean
  isSaving: boolean
  onSave: () => void
  onReset: () => void
  onExport: () => void
}

export default function SeatingToolbar({
  isModified, 
  isSaving, 
  onSave, 
  onReset, 
  onExport
}: SeatingToolbarProps) {
  return (
    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onSave}
            disabled={!isModified || isSaving}
            className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={onReset}
            disabled={!isModified}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2 bg-chart-green text-white rounded-lg hover:bg-chart-green/90 font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Chart
          </button>
        </div>

        {isModified && (
          <div className="absolute left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-1">
            <span className="text-xs font-semibold text-yellow-800">
              Unsaved changes
            </span>
          </div>
        )}
      </div>
    </div>
  )
}