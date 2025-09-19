import React, { useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle } from 'lucide-react'

interface AgendaBulkUploadProps {
  onUpload: (agendaItems: any[]) => void
  onCancel: () => void
}

export default function AgendaBulkUpload({ onUpload, onCancel }: AgendaBulkUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setIsProcessing(true)
    setErrors([])
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setErrors(['File must contain at least a header row and one data row'])
        setIsProcessing(false)
        return
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredHeaders = ['title', 'date', 'starttime', 'endtime', 'location', 'type']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        setErrors([`Missing required columns: ${missingHeaders.join(', ')}`])
        setIsProcessing(false)
        return
      }
      
      const data = []
      const newErrors = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: any = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        
        // Validate required fields
        if (!row.title || !row.date || !row.starttime || !row.endtime || !row.location || !row.type) {
          newErrors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }
        
        // Validate session type
        const validTypes = ['keynote', 'breakout', 'executive-presentation', 'panel', 'meal', 'reception', 'networking']
        if (!validTypes.includes(row.type.toLowerCase())) {
          newErrors.push(`Row ${i + 1}: Invalid session type. Must be one of: Keynote, Breakout, Executive Presentation, Panel, Meal, Reception, Networking`)
          continue
        }
        
        // Set proper field names and defaults
        row.startTime = row.starttime
        row.endTime = row.endtime
        row.type = row.type.toLowerCase()
        row.description = row.description || ''
        row.capacity = row.capacity ? parseInt(row.capacity) : undefined
        row.attendeeSelection = row.attendeeselection || 'everyone'
        row.selectedAttendees = row.attendeeselection === 'selected' ? [] : undefined
        
        // Handle speaker information if provided
        if (row.speakername) {
          row.speaker = {
            id: Date.now().toString() + Math.random().toString(),
            name: row.speakername,
            title: row.speakertitle || '',
            company: row.speakercompany || '',
            photo: row.speakerphoto || 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400',
            companyLogo: row.companylogo || 'https://logo.clearbit.com/example.com',
            bio: row.speakerbio || ''
          }
        }
        
        data.push(row)
      }
      
      setErrors(newErrors)
      setUploadedData(data)
      
    } catch (error) {
      setErrors(['Error reading file. Please ensure it\'s a valid CSV file.'])
    }
    
    setIsProcessing(false)
  }

  const downloadTemplate = () => {
    const template = [
      'title,description,date,starttime,endtime,location,type,capacity,attendeeselection,speakername,speakertitle,speakercompany,speakerphoto,companylogo,speakerbio',
      'Welcome Keynote,Opening keynote presentation,2025-03-15,09:00,10:00,Main Auditorium,keynote,,everyone,John Smith,CEO,Global Corp,https://example.com/photo.jpg,https://example.com/logo.png,Bio here',
      'Digital Transformation,Workshop on digital strategies,2025-03-15,10:30,11:30,Room A,breakout,50,selected,Jane Doe,CTO,Tech Inc,https://example.com/photo2.jpg,https://example.com/logo2.png,Another bio'
    ].join('\n')
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agenda_template.csv'
    a.click()
  }

  const handleUpload = () => {
    if (uploadedData.length > 0) {
      onUpload(uploadedData)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Bulk Upload Agenda
          </h1>
          <p className="text-brand-gray">
            Upload multiple agenda sessions using a CSV file
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-brand-gray hover:text-brand-navy"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-navy">
              CSV Template
            </h3>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>
          <p className="text-sm text-brand-gray mb-4">
            Download the CSV template to ensure your file has the correct format and required columns.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-brand-navy mb-2">Required columns:</p>
            <ul className="text-sm text-brand-gray space-y-1">
              <li>• <strong>title</strong> - Session title</li>
              <li>• <strong>date</strong> - Session date (YYYY-MM-DD format)</li>
              <li>• <strong>starttime</strong> - Start time (HH:MM format)</li>
              <li>• <strong>endtime</strong> - End time (HH:MM format)</li>
              <li>• <strong>location</strong> - Session location</li>
              <li>• <strong>type</strong> - Session type (keynote, breakout, meal, reception, networking)</li>
            </ul>
            <p className="text-sm font-semibold text-brand-navy mb-2 mt-4">Optional columns:</p>
            <ul className="text-sm text-brand-gray space-y-1">
              <li>• <strong>description</strong> - Session description</li>
              <li>• <strong>capacity</strong> - Maximum attendees</li>
              <li>• <strong>attendeeselection</strong> - 'everyone' or 'selected'</li>
              <li>• <strong>speakername</strong> - Speaker's full name</li>
              <li>• <strong>speakertitle</strong> - Speaker's job title</li>
              <li>• <strong>speakercompany</strong> - Speaker's company</li>
              <li>• <strong>speakerphoto</strong> - URL to speaker photo</li>
              <li>• <strong>companylogo</strong> - URL to company logo</li>
              <li>• <strong>speakerbio</strong> - Speaker biography</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy mb-4">
            Upload CSV File
          </h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-brand-navy bg-brand-navy/5' 
                : 'border-gray-300 hover:border-brand-navy'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-lg font-semibold text-brand-navy mb-2">
              Drop your CSV file here
            </p>
            <p className="text-brand-gray mb-4">
              or click to browse and select a file
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold"
            >
              Select CSV File
            </label>
          </div>
        </div>

        {isProcessing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
              <span className="text-brand-navy font-semibold">Processing file...</span>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">
                Upload Errors
              </h3>
            </div>
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {uploadedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-600">
                Ready to Upload
              </h3>
            </div>
            <p className="text-sm text-brand-gray mb-4">
              Successfully processed {uploadedData.length} agenda sessions.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-brand-navy">Title</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Date</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Time</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Location</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Type</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Speaker</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedData.slice(0, 10).map((session, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-brand-navy">{session.title}</td>
                      <td className="py-2 text-brand-gray">{new Date(session.date).toLocaleDateString()}</td>
                      <td className="py-2 text-brand-gray">{session.startTime} - {session.endTime}</td>
                      <td className="py-2 text-brand-gray">{session.location}</td>
                      <td className="py-2 text-brand-gray">{session.type}</td>
                      <td className="py-2 text-brand-gray">{session.speaker?.name || 'No speaker'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadedData.length > 10 && (
                <p className="text-xs text-brand-gray mt-2 text-center">
                  ... and {uploadedData.length - 10} more sessions
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
              >
                Upload {uploadedData.length} Sessions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}