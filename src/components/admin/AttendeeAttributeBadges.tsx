import React from 'react'
import { getFundAffiliationDisplayLabel, type CanonicalFundAffiliation } from '../../utils/fundAffiliationUtils'

interface AttendeeAttributeBadgesProps {
  attendee: any
}

interface AttributeBadge {
  key: string
  label: string
  color: string
  condition: (attendee: any) => boolean
  priority: number // Lower numbers = higher priority
}

const attributeBadges: AttributeBadge[] = [
  // Apax Personnel (highest priority)
  {
    key: 'apaxIP',
    label: 'Apax IP',
    color: 'bg-light-purple text-white',
    condition: (attendee) => attendee.attributes?.apaxIP || false,
    priority: 1
  },
  {
    key: 'apaxEP',
    label: 'Apax EP',
    color: 'bg-dark-purple text-white',
    condition: (attendee) => attendee.attributes?.apaxEP || false,
    priority: 2
  },
  {
    key: 'apaxOEP',
    label: 'Apax OEP',
    color: 'bg-chart-green text-white',
    condition: (attendee) => attendee.attributes?.apaxOEP || false,
    priority: 3
  },
  {
    key: 'apaxOther',
    label: 'Apax Other',
    color: 'bg-brand-navy text-white',
    condition: (attendee) => attendee.attributes?.apaxOther || false,
    priority: 4
  },
  
  // C-Level Roles
  {
    key: 'ceo',
    label: 'CEO',
    color: 'bg-chart-red text-white',
    condition: (attendee) => attendee.attributes?.ceo || false,
    priority: 5
  },
  {
    key: 'cfo',
    label: 'CFO',
    color: 'bg-blue-600 text-white',
    condition: (attendee) => attendee.attributes?.cfo || attendee.is_cfo || false,
    priority: 6
  },
  {
    key: 'cmo',
    label: 'CMO',
    color: 'bg-purple-600 text-white',
    condition: (attendee) => attendee.attributes?.cmo || false,
    priority: 7
  },
  {
    key: 'cro',
    label: 'CRO',
    color: 'bg-indigo-600 text-white',
    condition: (attendee) => attendee.attributes?.cro || false,
    priority: 8
  },
  {
    key: 'coo',
    label: 'COO',
    color: 'bg-teal-600 text-white',
    condition: (attendee) => attendee.attributes?.coo || false,
    priority: 9
  },
  {
    key: 'chro',
    label: 'CHRO',
    color: 'bg-pink-600 text-white',
    condition: (attendee) => attendee.attributes?.chro || false,
    priority: 10
  },
  {
    key: 'cto_cio',
    label: 'CTO/CIO',
    color: 'bg-cyan-600 text-white',
    condition: (attendee) => attendee.attributes?.cto_cio || false,
    priority: 10.5
  },
  {
    key: 'cLevelExec',
    label: 'C-Level Exec',
    color: 'bg-gray-600 text-white',
    condition: (attendee) => attendee.attributes?.cLevelExec || false,
    priority: 11
  },
  {
    key: 'nonCLevelExec',
    label: 'Non C-Level',
    color: 'bg-gray-500 text-white',
    condition: (attendee) => attendee.attributes?.nonCLevelExec || false,
    priority: 12
  },
  
  // External Attendee Types
  {
    key: 'portfolioCompanyExecutive',
    label: 'Portco Exec',
    color: 'bg-sector-services text-white',
    condition: (attendee) => attendee.attributes?.portfolioCompanyExecutive || false,
    priority: 13
  },
  {
    key: 'sponsorAttendee',
    label: 'Sponsor',
    color: 'bg-sector-tech text-white',
    condition: (attendee) => attendee.attributes?.sponsorAttendee || false,
    priority: 14
  },
  {
    key: 'speaker',
    label: 'Speaker',
    color: 'bg-orange-600 text-white',
    condition: (attendee) => attendee.attributes?.speaker || false,
    priority: 15
  },
  {
    key: 'spouse',
    label: 'Spouse',
    color: 'bg-purple-500 text-white',
    condition: (attendee) => attendee.isSpouse || attendee.is_spouse || false,
    priority: 16
  },
  {
    key: 'otherAttendeeType',
    label: 'Guest/Other',
    color: 'bg-brand-gray text-white',
    condition: (attendee) => attendee.attributes?.otherAttendeeType || false,
    priority: 17
  }
]

export default function AttendeeAttributeBadges({ attendee }: AttendeeAttributeBadgesProps) {
  // Get all applicable badges for this attendee
  const applicableBadges = attributeBadges
    .filter(badge => badge.condition(attendee))
    .sort((a, b) => a.priority - b.priority) // Sort by priority

  // If no specific attributes, show Guest/Other as fallback
  const hasAnySpecificAttribute = applicableBadges.length > 0
  
  if (!hasAnySpecificAttribute) {
    applicableBadges.push({
      key: 'fallback',
      label: 'Guest/Other',
      color: 'bg-brand-gray text-white',
      condition: () => true,
      priority: 99
    })
  }

  // Handle fund affiliation as a special case
  const fundAffiliation = attendee.attributes?.fundAffiliation
  if (fundAffiliation && fundAffiliation.trim()) {
    const displayLabel = getFundAffiliationDisplayLabel(fundAffiliation as CanonicalFundAffiliation)
    applicableBadges.push({
      key: 'fundAffiliation',
      label: displayLabel || `Fund: ${fundAffiliation}`,
      color: 'bg-emerald-600 text-white',
      condition: () => true,
      priority: 0 // Highest priority
    })
  }

  return (
    <div className="flex flex-col space-y-1">
      {applicableBadges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge.color} whitespace-nowrap`}
          title={badge.label}
        >
          {badge.label}
        </span>
      ))}
    </div>
  )
}