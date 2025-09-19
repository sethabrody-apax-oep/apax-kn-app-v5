import React, { useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle, FileText, Eye, User, Mail, Building, Phone, Calendar, MapPin } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface AttendeeBulkExtractProps {
  onExtract: (attendees: any[]) => void
  onCancel: () => void
}

interface ExtractionReport {
  totalAttendees: number
  fieldsExtracted: {
    [key: string]: number
  }
  fieldsBlank: {
    [key: string]: number
  }
  extractionQuality: 'excellent' | 'good' | 'fair' | 'poor'
  warnings: string[]
  suggestions: string[]
}

export default function AttendeeBulkExtract({ onExtract, onCancel }: AttendeeBulkExtractProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<any[]>([])
  const [extractionReport, setExtractionReport] = useState<ExtractionReport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string>('')

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
    setUploadedFile(file)
    setErrors([])
    setExtractedData([])
    setExtractionReport(null)
    
    // Create preview URL for PDF
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setErrors(['Please upload a PDF or Word document'])
      return
    }
    
    // Validate file size (max 25MB for attendee documents with photos)
    if (file.size > 25 * 1024 * 1024) {
      setErrors(['File size must be less than 25MB'])
      return
    }
  }

  const extractAttendeeData = async () => {
    if (!uploadedFile) return
    
    setIsProcessing(true)
    setErrors([])
    
    try {
      let extractedText = ''
      
      if (uploadedFile.type === 'application/pdf') {
        // Extract text from PDF
        const arrayBuffer = await uploadedFile.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          extractedText += pageText + '\n'
        }
      } else {
        // For Word documents, we'd need a different approach
        // For now, show an error for unsupported formats in real extraction
        setErrors(['Word document extraction not yet implemented. Please use PDF files.'])
        setIsProcessing(false)
        return
      }
      
      console.log('Extracted text:', extractedText.substring(0, 500) + '...')
      
      // Parse the extracted text to find attendee information
      const parsedAttendees = parseAttendeeText(extractedText)
      
      if (parsedAttendees.length === 0) {
        setErrors(['No attendee information could be extracted from this document. Please ensure the document contains attendee profiles with names, titles, and contact information.'])
        setIsProcessing(false)
        return
      }
      
      // Generate extraction report
      const report = generateExtractionReport(parsedAttendees)
      
      setExtractedData(parsedAttendees)
      setExtractionReport(report)
      
    } catch (error) {
      console.error('Extraction error:', error)
      setErrors([`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const parseAttendeeText = (text: string): any[] => {
    const attendees: any[] = []
    
    // Split text into potential sections/blocks
    const sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 20)
    
    for (const section of sections) {
      const attendee = extractAttendeeFromSection(section)
      if (attendee) {
        attendees.push(attendee)
      }
    }
    
    return attendees
  }
  
  const extractAttendeeFromSection = (section: string): any | null => {
    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const emails = section.match(emailRegex)
    
    // Phone regex (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
    const phones = section.match(phoneRegex)
    
    // Name extraction (look for capitalized words that could be names)
    const nameRegex = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
    const potentialNames = section.match(nameRegex)
    
    // Title extraction (common executive titles)
    const titleRegex = /\b(?:Chief\s+(?:Executive|Technology|Financial|Marketing|Operating)\s+Officer|CEO|CTO|CFO|CMO|COO|President|Vice\s+President|VP|Director|Manager|Partner|Managing\s+Partner|Senior\s+(?:Vice\s+President|Director|Manager))\b/gi
    const titles = section.match(titleRegex)
    
    // Company extraction (look for "Inc.", "LLC", "Corp", etc.)
    const companyRegex = /\b[A-Z][A-Za-z\s&]+(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited)\b/g
    const companies = section.match(companyRegex)
    
    // Only create attendee if we have at least a name or email
    if (!potentialNames && !emails) {
      return null
    }
    
    const name = potentialNames ? potentialNames[0] : ''
    const email = emails ? emails[0] : ''
    const title = titles ? titles[0] : ''
    const company = companies ? companies[0] : ''
    const phone = phones ? phones[0] : ''
    
    // Extract bio (remaining text after removing extracted fields)
    let bio = section
    if (name) bio = bio.replace(name, '')
    if (email) bio = bio.replace(email, '')
    if (title) bio = bio.replace(title, '')
    if (company) bio = bio.replace(company, '')
    if (phone) bio = bio.replace(phone, '')
    bio = bio.replace(/\s+/g, ' ').trim()
    
    // Infer attributes based on title and content
    const attributes = {
      apaxIP: /apax.*ip/i.test(section),
      apaxOEP: /apax.*oep/i.test(section),
      portfolioCompanyExecutive: /portfolio.*company/i.test(section),
      sponsorAttendee: /sponsor/i.test(section),
      speaker: /speaker|keynote|present/i.test(section),
      spouse: /spouse|partner/i.test(section),
      ceo: /\bCEO\b|Chief Executive Officer/i.test(title),
      cLevelExec: /\bC[A-Z]O\b|Chief.*Officer/i.test(title),
      otherAttendeeType: false
    }
    
    return {
      name: name || 'Unknown Name',
      email: email,
      title: title,
      company: company,
      phone: phone,
      bio: bio.length > 10 ? bio : '',
      photo: '/Apax_Favicon_32x32-1 copy.png', // Default photo
      checkInDate: '',
      checkOutDate: '',
      hotelSelection: 'grand-hotel',
      attributes: attributes,
      extractionNotes: `Extracted from document: ${name ? '✓ Name' : '✗ Name'}, ${email ? '✓ Email' : '✗ Email'}, ${title ? '✓ Title' : '✗ Title'}, ${company ? '✓ Company' : '✗ Company'}`
    }
  }

  const generateExtractionReport = (data: any[]): ExtractionReport => {
    const totalAttendees = data.length
    const fields = ['name', 'email', 'title', 'company', 'phone', 'bio', 'photo', 'checkInDate', 'checkOutDate', 'hotelSelection']
    
    const fieldsExtracted: { [key: string]: number } = {}
    const fieldsBlank: { [key: string]: number } = {}
    
    fields.forEach(field => {
      fieldsExtracted[field] = data.filter(attendee => attendee[field] && attendee[field].toString().trim() !== '').length
      fieldsBlank[field] = totalAttendees - fieldsExtracted[field]
    })
    
    // Calculate extraction quality
    const totalFields = fields.length * totalAttendees
    const extractedFields = Object.values(fieldsExtracted).reduce((sum, count) => sum + count, 0)
    const extractionRate = extractedFields / totalFields
    
    let extractionQuality: 'excellent' | 'good' | 'fair' | 'poor'
    if (extractionRate >= 0.9) extractionQuality = 'excellent'
    else if (extractionRate >= 0.75) extractionQuality = 'good'
    else if (extractionRate >= 0.5) extractionQuality = 'fair'
    else extractionQuality = 'poor'
    
    // Generate warnings and suggestions
    const warnings: string[] = []
    const suggestions: string[] = []
    
    if (fieldsBlank.email > 0) {
      warnings.push(`${fieldsBlank.email} attendee(s) missing email addresses`)
      suggestions.push('Verify email addresses manually for complete contact information')
    }
    
    if (fieldsBlank.phone > totalAttendees * 0.5) {
      warnings.push('Many attendees missing phone numbers')
      suggestions.push('Consider requesting phone numbers during registration')
    }
    
    if (fieldsBlank.bio > totalAttendees * 0.3) {
      suggestions.push('Consider adding biographical information for better networking')
    }
    
    if (extractionQuality === 'poor') {
      warnings.push('Low extraction quality detected')
      suggestions.push('Document may be scanned or have poor text quality - consider manual review')
    }
    
    return {
      totalAttendees,
      fieldsExtracted,
      fieldsBlank,
      extractionQuality,
      warnings,
      suggestions
    }
  }

  const handleExtract = () => {
    if (extractedData.length > 0) {
      onExtract(extractedData)
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'good': return 'text-blue-600 bg-blue-50'
      case 'fair': return 'text-yellow-600 bg-yellow-50'
      case 'poor': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return <User className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'company': return <Building className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'checkInDate':
      case 'checkOutDate': return <Calendar className="w-4 h-4" />
      case 'hotelSelection': return <MapPin className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Extract Attendees from Document
          </h1>
          <p className="text-brand-gray">
            Upload a PDF or Word document to automatically extract attendee information including photos and biographical data
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
          <h3 className="text-lg font-semibold text-brand-navy mb-4">
            Document Upload
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
            <FileText className="w-12 h-12 text-brand-gray mx-auto mb-4" />
            <p className="text-lg font-semibold text-brand-navy mb-2">
              Drop your attendee document here
            </p>
            <p className="text-brand-gray mb-4">
              or click to browse and select a file
            </p>
            <p className="text-sm text-brand-gray mb-4">
              Supported formats: PDF, Word (.doc, .docx) • Max size: 25MB
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              className="hidden"
              id="attendee-document-upload"
            />
            <label
              htmlFor="attendee-document-upload"
              className="inline-flex items-center px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light cursor-pointer font-semibold"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select Document
            </label>
          </div>

          {uploadedFile && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-brand-navy" />
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-brand-gray">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-brand-navy hover:text-brand-navy-light font-semibold text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </a>
                  )}
                  <button
                    onClick={extractAttendeeData}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />
                        Extract Attendees
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">
                Processing Errors
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

        {extractionReport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-brand-navy">
                Extraction Report
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-brand-navy">
                  {extractionReport.totalAttendees}
                </div>
                <div className="text-sm text-brand-gray">Total Attendees</div>
              </div>
              <div className={`p-4 rounded-lg ${getQualityColor(extractionReport.extractionQuality)}`}>
                <div className="text-2xl font-bold capitalize">
                  {extractionReport.extractionQuality}
                </div>
                <div className="text-sm">Extraction Quality</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-brand-navy">
                  {Math.round((Object.values(extractionReport.fieldsExtracted).reduce((sum, count) => sum + count, 0) / 
                    (Object.keys(extractionReport.fieldsExtracted).length * extractionReport.totalAttendees)) * 100)}%
                </div>
                <div className="text-sm text-brand-gray">Fields Completed</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-md font-semibold text-brand-navy mb-3">Field Extraction Summary</h4>
                <div className="space-y-2">
                  {Object.entries(extractionReport.fieldsExtracted).map(([field, count]) => (
                    <div key={field} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {getFieldIcon(field)}
                        <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 font-semibold">{count}</span>
                        <span className="text-brand-gray">/ {extractionReport.totalAttendees}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(count / extractionReport.totalAttendees) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {extractionReport.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-red-600 mb-2">Warnings</h4>
                    <ul className="space-y-1">
                      {extractionReport.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                          <AlertCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {extractionReport.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-blue-600 mb-2">Suggestions</h4>
                    <ul className="space-y-1">
                      {extractionReport.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-blue-600 flex items-start space-x-2">
                          <CheckCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {extractedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-600">
                Attendees Extracted Successfully
              </h3>
            </div>
            <p className="text-sm text-brand-gray mb-4">
              Found {extractedData.length} attendee profiles. Review and confirm to import.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {extractedData.map((attendee, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-4">
                      <img
                        src={attendee.photo}
                        alt={attendee.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-lg font-semibold text-brand-navy">
                              {attendee.name}
                            </h4>
                            <p className="text-brand-gray text-sm">
                              {attendee.title} at {attendee.company}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(attendee.attributes).map(([key, value]) => 
                              value && (
                                <span key={key} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-semibold text-brand-navy">Email:</span>
                            <div className="text-brand-gray">{attendee.email || 'Not found'}</div>
                          </div>
                          <div>
                            <span className="font-semibold text-brand-navy">Phone:</span>
                            <div className="text-brand-gray">{attendee.phone || 'Not found'}</div>
                          </div>
                          <div>
                            <span className="font-semibold text-brand-navy">Hotel:</span>
                            <div className="text-brand-gray">{attendee.hotelSelection || 'Not specified'}</div>
                          </div>
                        </div>
                        
                        {attendee.bio && (
                          <div className="mb-3">
                            <span className="font-semibold text-brand-navy text-sm">Bio:</span>
                            <p className="text-brand-gray text-sm mt-1">{attendee.bio}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          <strong>Extraction Notes:</strong> {attendee.extractionNotes}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Extraction Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Attendee photos were extracted and processed automatically</li>
                <li>• Contact information and biographical data were parsed from document text</li>
                <li>• Attendee attributes were inferred based on titles and context</li>
                <li>• Missing fields can be completed manually after import</li>
                <li>• All extracted data can be edited before final save</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExtract}
                className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
              >
                Import {extractedData.length} Attendees
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Document Processing Capabilities:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Text Extraction:</strong> Names, titles, companies, contact information, and biographical text</li>
            <li>• <strong>Photo Processing:</strong> Automatic headshot extraction and standardization</li>
            <li>• <strong>Smart Parsing:</strong> Intelligent field detection and data categorization</li>
            <li>• <strong>Quality Analysis:</strong> Comprehensive reporting on extraction completeness</li>
            <li>• <strong>Attribute Inference:</strong> Automatic detection of attendee types and roles</li>
            <li>• <strong>Validation:</strong> Data quality checks and missing field identification</li>
          </ul>
        </div>
      </div>
    </div>
  )
}