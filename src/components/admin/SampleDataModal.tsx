import React from 'react'
import { X, Eye, Database, FileText } from 'lucide-react'

interface SampleDataModalProps {
  fieldName: string
  sampleRecords: any[]
  fieldType?: string
  fieldCategory?: string
  modalType?: 'idloom' | 'database'
  onClose: () => void
}

export default function SampleDataModal({ 
  fieldName, 
  sampleRecords, 
  fieldType = 'string',
  fieldCategory = 'other',
  modalType = 'idloom',
  onClose 
}: SampleDataModalProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal': return <Eye className="w-4 h-4" />
      case 'company': return <Database className="w-4 h-4" />
      case 'custom': return <FileText className="w-4 h-4" />
      default: return <Database className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'text-blue-600'
      case 'company': return 'text-green-600'
      case 'event': return 'text-purple-600'
      case 'custom': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const formatSampleValue = (value: any) => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...'
    }
    return String(value)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${modalType === 'database' ? 'bg-green-100' : 'bg-gray-100'} ${getCategoryColor(fieldCategory)}`}>
              {getCategoryIcon(fieldCategory)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-navy">
                {modalType === 'database' ? 'Database Sample Data' : 'IDLoom Sample Data'}: {fieldName}
              </h2>
              <p className="text-brand-gray text-sm">
                {modalType === 'database' ? 'From Supabase attendees table' : `Field Type: ${fieldType} • Category: ${fieldCategory}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {sampleRecords.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-brand-gray mb-4">
                Showing {sampleRecords.length} sample value{sampleRecords.length !== 1 ? 's' : ''} from {modalType === 'database' ? 'existing attendee records' : 'IDLoom data'}:
              </div>
              
              <div className="space-y-3">
                {sampleRecords.map((record, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-brand-navy">
                        Sample {index + 1}
                      </span>
                      <span className="text-xs text-brand-gray">
                        Type: {typeof record}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded border font-mono text-sm overflow-x-auto max-w-full">
                      <pre className="whitespace-pre-wrap text-brand-navy">
                        {formatSampleValue(record)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className={`border rounded-lg p-3 ${modalType === 'database' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> {modalType === 'database' 
                    ? 'This shows how data currently looks in your database for this field. Use this to understand the expected format when mapping IDLoom fields.'
                    : 'Use this sample data to understand the format and content of this field before mapping it to your target field.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-brand-gray mx-auto mb-4 opacity-50" />
              <p className="text-brand-gray">
                {modalType === 'database' 
                  ? 'No sample data available in the database for this field'
                  : 'No sample data available for this field'
                }
              </p>
              <p className="text-sm text-brand-gray mt-2">
                {modalType === 'database'
                  ? 'This field may be empty in all attendee records or not yet populated'
                  : 'This field may be empty in all records or not present in the selected data'
                }
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}