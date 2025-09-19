// Fund Affiliation Standardization Utilities

export type CanonicalFundAffiliation = 'buyout' | 'digital' | 'impact' | 'other'

export interface FundAffiliationMapping {
  canonical: CanonicalFundAffiliation
  displayLabel: string
  variants: string[]
}

// Canonical fund affiliation mappings
export const FUND_AFFILIATION_MAPPINGS: FundAffiliationMapping[] = [
  {
    canonical: 'buyout',
    displayLabel: 'Buyout Funds',
    variants: [
      'buyout',
      'Buyout',
      'BUYOUT',
      'Fund:buyout',
      'Fund: buyout',
      'Fund: Buyout',
      'Fund: Buyout Funds',
      'Fund:Buyout',
      'Fund:Buyout Funds',
      'buyout funds',
      'Buyout Funds'
    ]
  },
  {
    canonical: 'digital',
    displayLabel: 'Digital Funds',
    variants: [
      'digital',
      'Digital',
      'DIGITAL',
      'Fund:digital',
      'Fund: digital',
      'Fund: Digital',
      'Fund: Digital Funds',
      'Fund:Digital',
      'Fund:Digital Funds',
      'digital funds',
      'Digital Funds'
    ]
  },
  {
    canonical: 'impact',
    displayLabel: 'Impact Funds',
    variants: [
      'impact',
      'Impact',
      'IMPACT',
      'Fund:impact',
      'Fund: impact',
      'Fund: Impact',
      'Fund: Impact Funds',
      'Fund:Impact',
      'Fund:Impact Funds',
      'impact funds',
      'Impact Funds'
    ]
  },
  {
    canonical: 'other',
    displayLabel: 'Other Funds',
    variants: [
      'other',
      'Other',
      'OTHER',
      'Fund:other',
      'Fund: other',
      'Fund: Other',
      'Fund: Other Funds',
      'Fund:Other',
      'Fund:Other Funds',
      'other funds',
      'Other Funds'
    ]
  }
]

/**
 * Standardizes a fund affiliation value to the canonical format
 */
export function standardizeFundAffiliation(value: string | undefined | null): CanonicalFundAffiliation | undefined {
  if (!value || typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return undefined
  }

  // Find matching canonical value
  for (const mapping of FUND_AFFILIATION_MAPPINGS) {
    if (mapping.variants.includes(trimmedValue)) {
      return mapping.canonical
    }
  }

  // If no exact match, try case-insensitive matching
  const lowerValue = trimmedValue.toLowerCase()
  for (const mapping of FUND_AFFILIATION_MAPPINGS) {
    if (mapping.variants.some(variant => variant.toLowerCase() === lowerValue)) {
      return mapping.canonical
    }
  }

  // Default fallback
  return 'other'
}

/**
 * Gets the display label for a canonical fund affiliation
 */
export function getFundAffiliationDisplayLabel(canonical: CanonicalFundAffiliation | undefined): string {
  if (!canonical) return ''
  
  const mapping = FUND_AFFILIATION_MAPPINGS.find(m => m.canonical === canonical)
  return mapping?.displayLabel || ''
}

/**
 * Checks if a fund affiliation value needs standardization
 */
export function needsStandardization(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  const standardized = standardizeFundAffiliation(value)
  return standardized !== value
}

/**
 * Standardizes attributes object to ensure consistent fund affiliation format
 */
export function standardizeAttendeeAttributes(attributes: any): any {
  if (!attributes || typeof attributes !== 'object') {
    return attributes
  }

  const standardizedAttributes = { ...attributes }
  
  if (attributes.fundAffiliation) {
    const standardized = standardizeFundAffiliation(attributes.fundAffiliation)
    if (standardized) {
      standardizedAttributes.fundAffiliation = standardized
    } else {
      delete standardizedAttributes.fundAffiliation
    }
  }

  return standardizedAttributes
}