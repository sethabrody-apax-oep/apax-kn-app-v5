import React, { useState } from 'react'
import { X, Merge, AlertTriangle, CheckCircle, Search, Building } from 'lucide-react'

interface CompanyMergeModalProps {
  sourceCompany: any
  companies: any[]
  onMerge: (sourceId: string, targetId: string) => void
  onCancel: () => void
}

export default function CompanyMergeModal({ sourceCompany, companies, onMerge, onCancel }: CompanyMergeModalProps) {
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const potentialTargets = companies.filter(company => 
    company.id !== sourceCompany.id &&
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedTarget = companies.find(c => c.id === selectedTargetId)

  const handleMergeConfirm = () => {
    if (selectedTargetId) {
      onMerge(sourceCompany.id, selectedTargetId)
    }
  }

  if (showConfirmation && selectedTarget) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-brand-navy">
              Confirm Company Merge
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">Warning: This action cannot be undone</span>
              </div>
              <p className="text-sm text-yellow-700">
                This will permanently merge the companies and update all related data.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg flex-1">
                  <h4 className="font-semibold text-red-800 mb-2">Source Company (Will be removed)</h4>
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-700">{sourceCompany.name}</span>
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {sourceCompany.sector} • {sourceCompany.geography}
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <Merge className="w-8 h-8 text-brand-navy" />
                </div>

                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg flex-1">
                  <h4 className="font-semibold text-green-800 mb-2">Target Company (Will remain)</h4>
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">{selectedTarget.name}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {selectedTarget.sector} • {selectedTarget.geography}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">What will happen:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• "{sourceCompany.name}" will be added as an alias of "{selectedTarget.name}"</li>
                  <li>• All attendees with company "{sourceCompany.name}" will be updated to "{selectedTarget.name}"</li>
                  <li>• Apax partner assignments will be transferred to the target company</li>
                  <li>• The source company record will be permanently deleted</li>
                  <li>• This action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
            <button
              onClick={() => setShowConfirmation(false)}
              className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleMergeConfirm}
              className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              <Merge className="w-4 h-4 mr-2" />
              Confirm Merge
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Merge Company: {sourceCompany.name}
            </h2>
            <p className="text-brand-gray text-sm">
              Select the target company to merge with
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-brand-gray hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-brand-navy mb-2">
              Search Target Company
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray w-4 h-4" />
              <input
                type="text"
                placeholder="Search for target company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {potentialTargets.length > 0 ? (
              <div className="space-y-1 p-2">
                {potentialTargets.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setSelectedTargetId(company.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedTargetId === company.id
                        ? 'bg-brand-navy text-white'
                        : 'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="w-4 h-4" />
                      <div className="flex-1">
                        <div className="font-semibold">{company.name}</div>
                        <div className="text-xs opacity-75">
                          {company.sector} • {company.geography} • {company.subsector}
                        </div>
                      </div>
                      {selectedTargetId === company.id && (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-brand-gray">
                <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No companies found matching your search</p>
              </div>
            )}
          </div>

          {selectedTarget && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Target Selected</span>
              </div>
              <p className="text-sm text-green-700">
                "{sourceCompany.name}" will be merged into "{selectedTarget.name}"
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirmation(true)}
            disabled={!selectedTargetId}
            className="inline-flex items-center px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Merge className="w-4 h-4 mr-2" />
            Preview Merge
          </button>
        </div>
      </div>
    </div>
  )
}