import React, { useEffect } from 'react'
import { X, Download } from 'lucide-react'
import AttendeeAttributeBadges from './AttendeeAttributeBadges'

interface SponsorReportPDFContentProps {
  reportData: any
  onClose: () => void
}

export default function SponsorReportPDFContent({ reportData, onClose }: SponsorReportPDFContentProps) {
  
  useEffect(() => {
    // Add print-specific styles
    const printStyles = document.createElement('style')
    printStyles.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-content, .print-content * {
          visibility: visible;
        }
        .print-content {
          width: 100%;
         position: static !important;
         height: auto !important;
         overflow: visible !important;
        }
        .no-print {
          display: none !important;
        }
        .page-break {
          page-break-before: always;
        }
        .avoid-break {
          page-break-inside: avoid;
        }
        .company-section {
          page-break-inside: avoid;
          margin-bottom: 2rem;
        }
        .attendee-row {
          page-break-inside: avoid;
          margin-bottom: 0.5rem;
        }
        .category-header {
          page-break-after: avoid;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .company-header {
          page-break-after: avoid;
          margin-bottom: 1rem;
        }
       /* Force content to flow naturally */
       .print-content {
         position: relative !important;
         top: auto !important;
         left: auto !important;
         right: auto !important;
         bottom: auto !important;
         transform: none !important;
         max-width: none !important;
         margin: 0 !important;
         padding: 20px !important;
       }
       /* Ensure all containers allow content flow */
       .print-content > * {
         position: static !important;
         float: none !important;
         clear: both !important;
       }
       /* Fix any fixed/absolute positioned elements */
       .fixed, .absolute {
         position: static !important;
       }
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        .attendee-photo {
          width: 40px !important;
          height: 40px !important;
        }
        .company-logo {
          max-width: 120px !important;
          max-height: 60px !important;
        }
       /* Ensure page breaks work properly */
       @page {
         margin: 1in;
         size: letter;
       }
       /* Force content to be printable */
       html, body {
         height: auto !important;
         overflow: visible !important;
       }
      }
    `
    document.head.appendChild(printStyles)
    
    return () => {
      document.head.removeChild(printStyles)
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const getAttendeeRoleAttributes = (attendee: any) => {
    const attributes = []
    
    // Apax attributes
    if (attendee.attributes?.apaxIP) attributes.push('Apax IP')
    if (attendee.attributes?.apaxEP) attributes.push('Apax EP')
    if (attendee.attributes?.apaxOEP) attributes.push('Apax OEP')
    if (attendee.attributes?.apaxOther) attributes.push('Apax Other')
    
    // C-Level roles
    if (attendee.attributes?.ceo) attributes.push('CEO')
    if (attendee.attributes?.cfo || attendee.is_cfo) attributes.push('CFO')
    if (attendee.attributes?.cmo) attributes.push('CMO')
    if (attendee.attributes?.cro) attributes.push('CRO')
    if (attendee.attributes?.coo) attributes.push('COO')
    if (attendee.attributes?.chro) attributes.push('CHRO')
    if (attendee.attributes?.cto_cio) attributes.push('CTO/CIO')
    if (attendee.attributes?.cLevelExec) attributes.push('C-Level Exec')
    if (attendee.attributes?.nonCLevelExec) attributes.push('Non C-Level Exec')
    
    // Other attributes
    if (attendee.attributes?.portfolioCompanyExecutive) attributes.push('Portfolio Executive')
    if (attendee.attributes?.sponsorAttendee) attributes.push('Sponsor')
    if (attendee.attributes?.speaker) attributes.push('Speaker')
    if (attendee.is_spouse) attributes.push('Spouse')
    
    return attributes
  }

  const renderCompanySection = (company: any) => (
    <div key={company.id} className="company-section avoid-break mb-8">
      {/* Company Header */}
      <div className="company-header flex items-start space-x-4 mb-4 pb-4 border-b-2 border-gray-200">
        {company.logo && (
          <img
            src={company.logo}
            alt={company.name}
            className="company-logo w-24 h-12 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-brand-navy mb-2">
            {company.name}
          </h3>
          {company.description && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {company.description}
            </p>
          )}
        </div>
      </div>

      {/* Attendees List */}
      <div className="space-y-3">
        {company.attendees.map((attendee: any) => {
          const roleAttributes = getAttendeeRoleAttributes(attendee)
          
          return (
            <div key={attendee.id} className="attendee-row flex items-center space-x-4 py-2">
              {/* Headshot */}
              <img
                src={attendee.photo === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' 
                  ? '/Apax_Favicon_32x32-1 copy.png' 
                  : (attendee.photo || '/Apax_Favicon_32x32-1 copy.png')
                }
                alt={`${attendee.first_name} ${attendee.last_name}`}
                className="attendee-photo w-10 h-10 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                }}
              />
              
              {/* Name and Title */}
              <div className="flex-1">
                <div className="text-base font-semibold text-brand-navy">
                  {attendee.first_name} {attendee.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {attendee.title}
                </div>
              </div>
              
              {/* Role Attributes */}
              <div className="flex flex-wrap gap-1">
                {roleAttributes.map((attribute, index) => (
                  <span
                    key={index}
                    className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                  >
                    {attribute}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderCategorySection = (title: string, companies: any[], bgColor: string) => {
    if (companies.length === 0) return null
    
    return (
      <div className="mb-12">
        <div className={`category-header ${bgColor} text-white px-6 py-4 rounded-lg mb-6`}>
          <h2 className="text-2xl font-bold">
            {title} ({companies.length} {companies.length === 1 ? 'Company' : 'Companies'})
          </h2>
        </div>
        <div className="space-y-8">
          {companies.map(renderCompanySection)}
        </div>
      </div>
    )
  }

  const renderApaxSection = () => {
    const { companies, attendees } = reportData.apaxAttendees
    
    if (companies.length === 0 && 
        attendees.apaxIP.length === 0 && 
        attendees.apaxEP.length === 0 && 
        attendees.apaxOEP.length === 0 && 
        attendees.apaxOther.length === 0) {
      return null
    }
    
    // Only render if there are individual Apax attendees
    if (attendees.apaxIP.length === 0 && 
        attendees.apaxEP.length === 0 && 
        attendees.apaxOEP.length === 0 && 
        attendees.apaxOther.length === 0) {
      return null
    }
    
    return (
      <div className="mb-12">
        <div className="category-header bg-purple-600 text-white px-6 py-4 rounded-lg mb-6">
          <h2 className="text-2xl font-bold">
            Apax Attendees
          </h2>
        </div>
        
        {/* Individual Apax Personnel by Type */}
        <div className="space-y-6">
          {attendees.apaxIP.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-purple-600 mb-3 border-b border-purple-200 pb-2">
                Apax IP ({attendees.apaxIP.length})
              </h3>
              <div className="space-y-2">
                {attendees.apaxIP.map((attendee: any) => {
                  const roleAttributes = getAttendeeRoleAttributes(attendee)
                  return (
                    <div key={attendee.id} className="attendee-row flex items-center space-x-4 py-2">
                      <img
                        src={attendee.photo === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' 
                          ? '/Apax_Favicon_32x32-1 copy.png' 
                          : (attendee.photo || '/Apax_Favicon_32x32-1 copy.png')
                        }
                        alt={`${attendee.first_name} ${attendee.last_name}`}
                        className="attendee-photo w-10 h-10 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-base font-semibold text-brand-navy">
                          {attendee.first_name} {attendee.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendee.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roleAttributes.map((attribute, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                          >
                            {attribute}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {attendees.apaxEP.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-3 border-b border-purple-200 pb-2">
                Apax EP ({attendees.apaxEP.length})
              </h3>
              <div className="space-y-2">
                {attendees.apaxEP.map((attendee: any) => {
                  const roleAttributes = getAttendeeRoleAttributes(attendee)
                  return (
                    <div key={attendee.id} className="attendee-row flex items-center space-x-4 py-2">
                      <img
                        src={attendee.photo === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' 
                          ? '/Apax_Favicon_32x32-1 copy.png' 
                          : (attendee.photo || '/Apax_Favicon_32x32-1 copy.png')
                        }
                        alt={`${attendee.first_name} ${attendee.last_name}`}
                        className="attendee-photo w-10 h-10 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-base font-semibold text-brand-navy">
                          {attendee.first_name} {attendee.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendee.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roleAttributes.map((attribute, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                          >
                            {attribute}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {attendees.apaxOEP.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-3 border-b border-green-200 pb-2">
                Apax OEP ({attendees.apaxOEP.length})
              </h3>
              <div className="space-y-2">
                {attendees.apaxOEP.map((attendee: any) => {
                  const roleAttributes = getAttendeeRoleAttributes(attendee)
                  return (
                    <div key={attendee.id} className="attendee-row flex items-center space-x-4 py-2">
                      <img
                        src={attendee.photo === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' 
                          ? '/Apax_Favicon_32x32-1 copy.png' 
                          : (attendee.photo || '/Apax_Favicon_32x32-1 copy.png')
                        }
                        alt={`${attendee.first_name} ${attendee.last_name}`}
                        className="attendee-photo w-10 h-10 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-base font-semibold text-brand-navy">
                          {attendee.first_name} {attendee.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendee.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roleAttributes.map((attribute, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"
                          >
                            {attribute}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {attendees.apaxOther.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-blue-600 mb-3 border-b border-blue-200 pb-2">
                Other Apax ({attendees.apaxOther.length})
              </h3>
              <div className="space-y-2">
                {attendees.apaxOther.map((attendee: any) => {
                  const roleAttributes = getAttendeeRoleAttributes(attendee)
                  return (
                    <div key={attendee.id} className="attendee-row flex items-center space-x-4 py-2">
                      <img
                        src={attendee.photo === 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400' 
                          ? '/Apax_Favicon_32x32-1 copy.png' 
                          : (attendee.photo || '/Apax_Favicon_32x32-1 copy.png')
                        }
                        alt={`${attendee.first_name} ${attendee.last_name}`}
                        className="attendee-photo w-10 h-10 rounded-full object-cover border border-gray-300"
                        onError={(e) => {
                          e.currentTarget.src = '/Apax_Favicon_32x32-1 copy.png'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-base font-semibold text-brand-navy">
                          {attendee.first_name} {attendee.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendee.title}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {roleAttributes.map((attribute, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                          >
                            {attribute}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Print Controls - Hidden during print */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">
            KnowledgeNow 2025 - Attendee Directory for Sponsors
          </h1>
          <p className="text-sm text-gray-600">
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold"
          >
            <Download className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-brand-navy rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="print-content max-w-4xl mx-auto p-8">
        {/* Report Header */}
        <div className="text-center mb-12 avoid-break">
          <h1 className="text-3xl font-bold text-brand-navy mb-2">
            KnowledgeNow 2025
          </h1>
          <h2 className="text-xl text-gray-700 mb-4">
            Attendee Directory for Sponsors
          </h2>
          <div className="text-sm text-gray-600">
            Generated on {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            This directory contains all confirmed attendees organized by company category for sponsor networking and business development purposes.
          </div>
        </div>

        {/* Apax Attendees Section */}
        {renderApaxSection()}

        {/* Buyout Funds Section */}
        {renderCategorySection('Buyout Funds', reportData.buyoutFunds, 'bg-blue-600')}

        {/* Digital Funds Section */}
        {renderCategorySection('Digital Funds', reportData.digitalFunds, 'bg-indigo-600')}

        {/* Impact and Other Funds Section */}
        {renderCategorySection('Impact and Other Funds', reportData.impactAndOther, 'bg-green-600')}

        {/* Sponsors Section */}
        {renderCategorySection('Sponsors & Vendors', reportData.sponsors, 'bg-orange-600')}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>KnowledgeNow 2025 • Confidential Attendee Directory</p>
          <p>Generated from KnowledgeNow Event Administration System</p>
        </div>
      </div>
    </div>
  )
}