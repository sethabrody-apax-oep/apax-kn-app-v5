// Enhanced logo fetching utilities with multi-domain support

export interface LogoFetchResult {
  url: string
  source: string
  success: boolean
  error?: string
}

export class EnhancedLogoFetcher {
  private static logoServices = [
    { name: 'Clearbit', url: (domain: string) => `https://logo.clearbit.com/${domain}` },
    { name: 'Logo.dev', url: (domain: string) => `https://img.logo.dev/${domain}?token=pk_X-1ZO13ESEOdEhzIBHMKcQ` },
    { name: 'Uplead', url: (domain: string) => `https://logo.uplead.com/${domain}` },
    { name: 'Statvoo', url: (domain: string) => `https://api.statvoo.com/favicon/?url=${domain}` },
    { name: 'Direct Favicon', url: (domain: string) => `https://${domain}/favicon.ico` },
    { name: 'Google Favicons', url: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128` }
  ]

  // Test if an image URL is valid and accessible
  static testImageUrl(url: string, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      const timer = setTimeout(() => {
        img.onload = null
        img.onerror = null
        resolve(false)
      }, timeout)

      img.onload = () => {
        clearTimeout(timer)
        resolve(true)
      }
      
      img.onerror = () => {
        clearTimeout(timer)
        resolve(false)
      }
      
      img.src = url
    })
  }

  // Extract domain from various input formats
  static extractDomain(input: string): string {
    if (!input) return ''
    
    try {
      // If it's an email, extract domain part
      if (input.includes('@')) {
        return input.split('@')[1].toLowerCase()
      }
      
      // If it's a URL, extract hostname
      if (input.startsWith('http')) {
        const url = new URL(input)
        return url.hostname.replace('www.', '').toLowerCase()
      }
      
      // Otherwise, treat as domain and clean it
      return input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
    } catch (error) {
      return input.toLowerCase()
    }
  }

  // Fetch logo for a single domain using multiple services
  static async fetchLogoForDomain(domain: string): Promise<LogoFetchResult> {
    const cleanDomain = this.extractDomain(domain)
    
    if (!cleanDomain || cleanDomain.length < 3) {
      return {
        url: '',
        source: 'error',
        success: false,
        error: 'Invalid domain'
      }
    }

    // Try each logo service in order of preference
    for (const service of this.logoServices) {
      try {
        const logoUrl = service.url(cleanDomain)
        const isValid = await this.testImageUrl(logoUrl)
        
        if (isValid) {
          return {
            url: logoUrl,
            source: service.name,
            success: true
          }
        }
      } catch (error) {
        console.log(`Failed to fetch logo from ${service.name} for ${cleanDomain}:`, error)
        continue
      }
    }

    // If all services fail, generate a text-based fallback logo
    const fallbackLogo = this.generateFallbackLogo(cleanDomain)
    return {
      url: fallbackLogo,
      source: 'fallback',
      success: true
    }
  }

  // Fetch logos for multiple domains and return the best one
  static async fetchBestLogoFromDomains(domains: string[]): Promise<LogoFetchResult> {
    if (!domains || domains.length === 0) {
      return {
        url: '',
        source: 'error',
        success: false,
        error: 'No domains provided'
      }
    }

    // Prioritize domains (primary domains first, then by length - shorter is often better)
    const sortedDomains = [...domains].sort((a, b) => {
      // Prioritize common business domains
      const businessDomains = ['.com', '.org', '.net']
      const aIsBusiness = businessDomains.some(ext => a.endsWith(ext))
      const bIsBusiness = businessDomains.some(ext => b.endsWith(ext))
      
      if (aIsBusiness && !bIsBusiness) return -1
      if (!aIsBusiness && bIsBusiness) return 1
      
      // Then prioritize shorter domains
      return a.length - b.length
    })

    // Try each domain until we find a working logo
    for (const domain of sortedDomains) {
      const result = await this.fetchLogoForDomain(domain)
      if (result.success && result.source !== 'fallback') {
        return result
      }
    }

    // If no real logos found, return fallback for the first domain
    return this.fetchLogoForDomain(sortedDomains[0])
  }

  // Generate a text-based fallback logo
  static generateFallbackLogo(domain: string): string {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Background
      ctx.fillStyle = '#0e1821'
      ctx.fillRect(0, 0, 200, 80)
      
      // Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Inter, sans-serif'
      ctx.textAlign = 'center'
      
      // Use domain name or first part of domain
      const displayText = domain.split('.')[0].toUpperCase()
      ctx.fillText(displayText, 100, 45)
      
      return canvas.toDataURL()
    }
    
    return ''
  }

  // Extract domains from attendee email addresses
  static extractDomainsFromAttendees(attendees: any[]): Map<string, string[]> {
    const companyDomains = new Map<string, Set<string>>()
    
    attendees.forEach(attendee => {
      const email = attendee.email || attendee.email
      const companyName = attendee.company_name_standardized || attendee.company
      
      if (email && email.includes('@') && companyName) {
        const domain = this.extractDomain(email)
        
        // Skip personal/generic domains
        const personalDomains = [
          'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
          'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
          'example.com', 'test.com', 'temp.com', 'conference.temp'
        ]
        
        if (!personalDomains.includes(domain) && domain.length > 3) {
          if (!companyDomains.has(companyName)) {
            companyDomains.set(companyName, new Set())
          }
          companyDomains.get(companyName)!.add(domain)
        }
      }
    })
    
    // Convert Sets to Arrays
    const result = new Map<string, string[]>()
    for (const [company, domainSet] of companyDomains.entries()) {
      result.set(company, Array.from(domainSet))
    }
    
    return result
  }

  // Batch update company logos based on their domains
  static async batchUpdateCompanyLogos(companies: any[], onProgress?: (progress: number, total: number) => void): Promise<{
    updated: number
    failed: number
    results: Array<{ companyId: string; companyName: string; success: boolean; logoUrl?: string; error?: string }>
  }> {
    const results = []
    let updated = 0
    let failed = 0

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      
      try {
        // Get domains for this company
        const { data: domains } = await supabase
          .from('company_domains')
          .select('domain')
          .eq('standardized_company_id', company.id)
          .order('is_primary', { ascending: false })

        const domainList = (domains || []).map(d => d.domain)
        
        if (domainList.length > 0) {
          const logoResult = await this.fetchBestLogoFromDomains(domainList)
          
          if (logoResult.success) {
            // Update company logo
            const { error } = await supabase
              .from('standardized_companies')
              .update({ logo: logoResult.url })
              .eq('id', company.id)

            if (error) {
              throw error
            }

            // Update domain logo cache
            if (domainList.length > 0) {
              await supabase
                .from('company_domains')
                .update({ 
                  logo_url: logoResult.url,
                  logo_last_fetched: new Date().toISOString()
                })
                .eq('standardized_company_id', company.id)
                .eq('domain', this.extractDomain(domainList[0]))
            }

            results.push({
              companyId: company.id,
              companyName: company.name,
              success: true,
              logoUrl: logoResult.url
            })
            updated++
          } else {
            results.push({
              companyId: company.id,
              companyName: company.name,
              success: false,
              error: logoResult.error || 'No logo found'
            })
            failed++
          }
        } else {
          results.push({
            companyId: company.id,
            companyName: company.name,
            success: false,
            error: 'No domains available'
          })
          failed++
        }
      } catch (error) {
        console.error(`Error updating logo for ${company.name}:`, error)
        results.push({
          companyId: company.id,
          companyName: company.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, companies.length)
      }
    }

    return { updated, failed, results }
  }
}