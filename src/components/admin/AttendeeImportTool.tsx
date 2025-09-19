import React, { useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle, Users, Building, Mail, Phone } from 'lucide-react'
import { useSponsors } from '../../hooks/useSupabaseData'

interface AttendeeImportToolProps {
  onImport: (attendees: any[]) => void
  onCancel: () => void
}

export default function AttendeeImportTool({ onImport, onCancel }: AttendeeImportToolProps) {
  const { sponsors } = useSponsors()
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
      const requiredHeaders = ['firstname', 'lastname', 'title', 'company']
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
        
        // Validate required fields (email is no longer required)
        if (!row.firstname || !row.lastname || !row.title || !row.company) {
          newErrors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }
        
        // Validate email format only if email is provided
        if (row.email && row.email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(row.email)) {
            newErrors.push(`Row ${i + 1}: Invalid email format`)
            continue
          }
        } else {
          // Set email to empty string if not provided
          row.email = ''
        }
        
        // Include id if provided for updates
        if (row.id && row.id.trim()) {
          row.id = row.id.trim()
        } else {
          delete row.id
        }
        
        // Set defaults for optional fields
        row.bio = row.bio || ''
        row.phone = row.phone || ''
        if (row.photo && row.photo.trim()) {
          row.photo = row.photo.trim()
        } else {
          row.photo = '/Apax_Favicon_32x32-1 copy.png'
        }
        row.checkInDate = row.checkindate || row['check-in'] || '2025-03-15'
        row.checkOutDate = row.checkoutdate || row['check-out'] || '2025-03-17'
        row.hotelSelection = row.hotelselection || row.hotel || 'grand-hotel'
        row.selectedBreakouts = []
        
        // Handle spouse information
        row.hasSpouse = (row.hasspouse || '0') === '1'
        if (row.hasSpouse && row.spousefirstname && row.spouselastname) {
          row.spouseDetails = {
            salutation: row.spousesalutation || '',
            firstName: row.spousefirstname,
            lastName: row.spouselastname,
            email: row.spouseemail || '',
            mobilePhone: row.spousephone || '',
            dietaryRequirements: row.spousedietaryreqs || ''
          }
        } else {
          row.spouseDetails = {}
        }
        
        // Handle attendee attributes (1/0 values)
        row.attributes = {
          apaxIP: (row.apaxip || row['apax-ip'] || '0') === '1',
          apaxOEP: (row.apaxoep || row['apax-oep'] || '0') === '1',
          portfolioCompanyExecutive: (row.portfoliocompanyexecutive || row['portfolio-company-executive'] || '0') === '1',
          sponsorAttendee: (row.sponsorattendee || row['sponsor-attendee'] || '0') === '1',
          speaker: (row.speaker || '0') === '1',
          spouse: (row.spouse || '0') === '1',
          ceo: (row.ceo || '0') === '1',
          cLevelExec: (row.clevelexec || row['c-level-exec'] || '0') === '1',
          otherAttendeeType: (row.otherattendeettype || row['other-attendee-type'] || '0') === '1'
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
      'id,firstname,lastname,email,title,company,bio,phone,checkindate,checkoutdate,hotelselection,apaxip,apaxoep,portfoliocompanyexecutive,sponsorattendee,speaker,spouse,ceo,clevelexec,otherattendeettype,hasspouse,spousefirstname,spouselastname,spouseemail,spousephone',
      ',John,Smith,john@example.com,CEO,Example Corp,Bio here,+1234567890,2025-03-15,2025-03-17,grand-hotel,1,0,0,0,1,0,1,1,0,1,Jane,Smith,,+1234567891',
      ',Jane,Doe,jane@example.com,CTO,Tech Inc,Another bio,+0987654321,2025-03-14,2025-03-18,business-center,0,1,0,0,0,0,0,1,0,0,,,,',
      'existing-id-123,Mike,Johnson,mike@example.com,CFO,Finance Corp,Updated bio,+1555123456,2025-03-15,2025-03-17,grand-hotel,0,0,1,0,0,0,0,1,0,0,,,,'
    ].join('\n')
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attendee_template.csv'
    a.click()
  }

  const handleUpload = () => {
    if (uploadedData.length > 0) {
      onImport(uploadedData)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Base KN Import Tool
          </h1>
          <p className="text-brand-gray">
            Import attendees from KnowledgeNow base registration data
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
              <li>• <strong>firstname</strong> - First name of the attendee</li>
              <li>• <strong>lastname</strong> - Last name of the attendee</li>
              <li>• <strong>title</strong> - Job title</li>
              <li>• <strong>company</strong> - Company name</li>
            </ul>
            <p className="text-sm font-semibold text-brand-navy mb-2 mt-4">Optional columns:</p>
            <ul className="text-sm text-brand-gray space-y-1">
              <li>• <strong>id</strong> - Existing attendee ID (for updates)</li>
              <li>• <strong>email</strong> - Email address (optional for spouses)</li>
              <li>• <strong>bio</strong> - Biography</li>
              <li>• <strong>phone</strong> - Phone number</li>
              <li>• <strong>checkindate</strong> - Hotel check-in date (YYYY-MM-DD)</li>
              <li>• <strong>checkoutdate</strong> - Hotel check-out date (YYYY-MM-DD)</li>
              <li>• <strong>hotelselection</strong> - Hotel selection</li>
              <li>• <strong>hasspouse</strong> - Has spouse attending (1 or 0)</li>
              <li>• <strong>spousefirstname</strong> - Spouse first name</li>
              <li>• <strong>spouselastname</strong> - Spouse last name</li>
              <li>• <strong>spouseemail</strong> - Spouse email (optional)</li>
              <li>• <strong>spousephone</strong> - Spouse phone number</li>
              <li>• Various attribute flags (apaxip, apaxoep, etc.) - Use 1 or 0</li>
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
              Successfully processed {uploadedData.length} attendee records.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-brand-navy">First Name</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Last Name</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Email</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Title</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Company</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Hotel</th>
                    <th className="text-left py-2 font-semibold text-brand-navy">Spouse</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedData.slice(0, 10).map((attendee, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-brand-navy">{attendee.firstname}</td>
                      <td className="py-2 text-brand-navy">{attendee.lastname}</td>
                      <td className="py-2 text-brand-gray">{attendee.email || 'Not provided'}</td>
                      <td className="py-2 text-brand-gray">{attendee.title}</td>
                      <td className="py-2 text-brand-gray">{attendee.company}</td>
                      <td className="py-2 text-brand-gray">{attendee.hotelSelection || 'Not specified'}</td>
                      <td className="py-2 text-brand-gray">{attendee.hasSpouse ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadedData.length > 10 && (
                <p className="text-xs text-brand-gray mt-2 text-center">
                  ... and {uploadedData.length - 10} more records
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
                Import {uploadedData.length} Attendees
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}