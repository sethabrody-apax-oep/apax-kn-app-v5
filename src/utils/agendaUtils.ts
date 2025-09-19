// Agenda utility functions

/**
 * Convert agenda item title to breakout slug for matching with attendee selections
 */
export function getBreakoutSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Get all possible breakout slugs for an agenda item title
 * This handles variations in how titles might be stored vs. how they're referenced
 */
export function getBreakoutSlugs(title: string): string[] {
  const slugs = [getBreakoutSlug(title)]
  
  // Add common variations
  const lowerTitle = title.toLowerCase()
  
  // Handle specific known mappings
  if (lowerTitle.includes('software') && lowerTitle.includes('ceo')) {
    slugs.push('apax-software-ceo-summit', 'software-ceo-summit')
  }
  
  if (lowerTitle.includes('track a') || lowerTitle.includes('revenue') || lowerTitle.includes('growth')) {
    slugs.push('track-a-revenue-growth', 'track-a-digital')
  }
  
  if (lowerTitle.includes('track b') || lowerTitle.includes('operational') || lowerTitle.includes('performance')) {
    slugs.push('track-b-operational-performance', 'track-b-cfo-ops')
  }
  
  return [...new Set(slugs)] // Remove duplicates
}

/**
 * Check if an attendee has selected a specific agenda item
 */
export function hasAttendeeSelectedAgendaItem(attendee: any, agendaItemId: string, agendaItemTitle: string): boolean {
  const selectedBreakouts = attendee.selected_breakouts || attendee.selectedBreakouts || []
  
  if (!Array.isArray(selectedBreakouts)) {
    return false
  }
  
  // Check if attendee selected this specific agenda item by ID
  if (selectedBreakouts.includes(agendaItemId)) {
    return true
  }
  
  // Check if attendee selected this agenda item by any of its possible slugs
  const possibleSlugs = getBreakoutSlugs(agendaItemTitle)
  return possibleSlugs.some(slug => selectedBreakouts.includes(slug))
}

/**
 * Check if an attendee has confirmed attendance for a specific dining option
 */
export function hasAttendeeSelectedDiningOption(attendee: any, diningOptionId: string, diningOptionName: string): boolean {
  const diningSelections = attendee.dining_selections || attendee.diningSelections || {}
  
  if (!diningSelections || typeof diningSelections !== 'object') {
    return false
  }
  
  // Create multiple possible keys to match against attendee data
  const possibleKeys = [
    diningOptionId,
    diningOptionName.toLowerCase().replace(/\s+/g, '-'),
    diningOptionName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  ]
  
  // Check all possible keys to find matching dining selection
  for (const key of possibleKeys) {
    const diningSelection = diningSelections[key]
    if (diningSelection && typeof diningSelection === 'object') {
      // Check if main attendee is attending
      if (diningSelection.attending === true) {
        return true
      }
      // Also check if spouse is attending (they would need seating too)
      if (attendee.has_spouse && diningSelection.spouseAttending === true) {
        return true
      }
    }
  }
  
  return false
}