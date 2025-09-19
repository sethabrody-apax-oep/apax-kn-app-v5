import React, { useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle, FileText, Eye } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

interface AgendaDocumentUploadProps {
  onExtract: (agendaItems: any[]) => void
  onCancel: () => void
}

export default function AgendaDocumentUpload({ onExtract, onCancel }: AgendaDocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<any[]>([])
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
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(['File size must be less than 10MB'])
      return
    }
  }

  const extractAgendaData = async () => {
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
        setErrors(['Word document extraction not yet implemented. Please use PDF files.'])
        setIsProcessing(false)
        return
      }
      
      console.log('Extracted agenda text:', extractedText.substring(0, 500) + '...')
      
      // Parse the extracted text to find agenda information
      const parsedAgenda = parseAgendaText(extractedText)
      
      if (parsedAgenda.length === 0) {
        setErrors(['No agenda information could be extracted from this document. Please ensure the document contains session titles, times, and locations.'])
        setIsProcessing(false)
        return
      }
      
      setExtractedData(parsedAgenda)
      
    } catch (error) {
      console.error('Agenda extraction error:', error)
      setErrors([`Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const parseAgendaText = (text: string): any[] => {
    const sessions: any[] = []
    
    // Time regex to find session times
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/gi
    const dateRegex = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi
    
    // Split text into potential session blocks
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    
    let currentSession: any = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for time patterns that might indicate a session
      const timeMatches = line.match(timeRegex)
      
      if (timeMatches && timeMatches.length >= 2) {
        // If we have a current session, save it
        if (currentSession && currentSession.title) {
          sessions.push(currentSession)
        }
        
        // Start a new session
        currentSession = {
          title: '',
          description: '',
          date: '2025-03-15', // Default date
          startTime: timeMatches[0].replace(/[^\d:]/g, ''),
          endTime: timeMatches[1] ? timeMatches[1].replace(/[^\d:]/g, '') : '',
          location: '',
          type: 'breakout',
          attendeeSelection: 'everyone'
        }
        
        // Extract title from the same line (remove time)
        let title = line.replace(timeRegex, '').trim()
        title = title.replace(/[-–—]/g, '').trim()
        if (title.length > 3) {
          currentSession.title = title
        }
      } else if (currentSession) {
        // Look for session title if we don't have one
        if (!currentSession.title && line.length > 10 && line.length < 100) {
          currentSession.title = line
        }
        // Look for location indicators
        else if (/room|auditorium|hall|ballroom|terrace|center/i.test(line)) {
          currentSession.location = line
        }
        // Add to description
        else if (line.length > 20) {
          currentSession.description += (currentSession.description ? ' ' : '') + line
        }
      }
    }
    
    // Add the last session
    if (currentSession && currentSession.title) {
      sessions.push(currentSession)
    }
    
    // Infer session types
    return sessions.map(session => ({
      ...session,
      type: inferSessionType(session.title, session.description),
      capacity: session.type === 'breakout' ? 50 : undefined
    }))
  }
  
  const inferSessionType = (title: string, description: string): string => {
    const content = (title + ' ' + description).toLowerCase()
    
    if (/keynote|opening|closing|welcome/i.test(content)) return 'keynote'
    if (/lunch|dinner|breakfast|meal|food/i.test(content)) return 'meal'
    if (/reception|cocktail|networking|social/i.test(content)) return 'reception'
    if (/break|coffee|tea/i.test(content)) return 'networking'
    if (/executive|presentation/i.test(content)) return 'executive-presentation'
    if (/panel|discussion/i.test(content)) return 'panel'
    
    return 'breakout'
  }

  const handleExtract = () => {
    if (extractedData.length > 0) {
      onExtract(extractedData)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            Upload Agenda Document
          </h1>
          <p className="text-brand-gray">
            Upload a PDF or Word document to automatically extract agenda information
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
              Drop your agenda document here
            </p>
            <p className="text-brand-gray mb-4">
              or click to browse and select a file
            </p>
            <p className="text-sm text-brand-gray mb-4">
              Supported formats: PDF, Word (.doc, .docx) • Max size: 10MB
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              className="hidden"
              id="document-upload"
            />
            <label
              htmlFor="document-upload"
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
                    onClick={extractAgendaData}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Extract Agenda
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

        {extractedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-600">
                Agenda Extracted Successfully
              </h3>
            </div>
            <p className="text-sm text-brand-gray mb-4">
              Found {extractedData.length} agenda items. Review and confirm to import.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {extractedData.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-brand-navy">
                        {item.title}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.type === 'keynote' ? 'bg-sector-services/20 text-sector-services' :
                        item.type === 'breakout' ? 'bg-chart-green/20 text-green-800' :
                        item.type === 'meal' ? 'bg-sector-tech/20 text-orange-800' :
                        item.type === 'reception' ? 'bg-light-purple/20 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm text-brand-gray mb-3">
                      {item.description}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-brand-navy">Date:</span>
                        <div className="text-brand-gray">{new Date(item.date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-brand-navy">Time:</span>
                        <div className="text-brand-gray">{item.startTime} - {item.endTime}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-brand-navy">Location:</span>
                        <div className="text-brand-gray">{item.location}</div>
                      </div>
                      {item.capacity && (
                        <div>
                          <span className="font-semibold text-brand-navy">Capacity:</span>
                          <div className="text-brand-gray">{item.capacity} attendees</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Extraction Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Session times and locations were automatically detected</li>
                <li>• Session types were inferred based on content and naming patterns</li>
                <li>• Capacity limits were estimated for breakout sessions</li>
                <li>• You can edit any details after importing</li>
                <li>• Speaker assignments will need to be added manually</li>
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
                Import {extractedData.length} Sessions
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Document Processing Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Ensure your document has clear session titles, times, and locations</li>
            <li>• Use consistent formatting for dates and times (e.g., "9:00 AM - 10:00 AM")</li>
            <li>• Include session descriptions for better categorization</li>
            <li>• The system works best with structured agenda documents</li>
            <li>• You can always edit extracted information before final import</li>
          </ul>
        </div>
      </div>
    </div>
  )
}