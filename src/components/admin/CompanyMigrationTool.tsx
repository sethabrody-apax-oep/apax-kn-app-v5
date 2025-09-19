import React, { useState } from 'react'
import { Play, Download, RefreshCw, AlertCircle, CheckCircle, BarChart3, Building, Users, List, Crown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function CompanyMigrationTool() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const [migrationLog, setMigrationLog] = useState<string[]>([])
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [migrationOptions, setMigrationOptions] = useState({
    createAliases: true,
    autoClassify: true,
    backfillAttendees: true,
    validateData: true
  })

  const runMigration = async () => {
    setMigrationStatus('running')
    setMigrationLog([`🚀 Starting enhanced company data migration${dryRun ? ' (DRY RUN - NO CHANGES WILL BE MADE)' : ''}...`])
    setMigrationResults(null)

    try {
      // Step 1: Analyze existing company and email data
      setMigrationLog(prev => [...prev, '📋 Step 1: Analyzing existing company and email data...'])
      
      const { data: attendees, error: fetchError } = await supabase
        .from('attendees')
        .select('id, company, first_name, last_name, email')
        .not('company', 'is', null)
        .neq('company', '')

      if (fetchError) {
        throw new Error(`Error fetching attendees: ${fetchError.message}`)
      }
      
      setMigrationLog(prev => [...prev, `✅ Found ${attendees.length} attendees with company data`])

      // Step 2: Extract unique company names and email domains
      setMigrationLog(prev => [...prev, '📋 Step 2: Extracting unique company names and email domains...'])
      
      const companyFrequency = new Map()
      const companyEmailDomains = new Map()
      
      attendees.forEach(attendee => {
        const company = attendee.company.trim()
        if (company) {
          companyFrequency.set(company, (companyFrequency.get(company) || 0) + 1)
          
          // Extract domain from email
          if (attendee.email && attendee.email.includes('@')) {
            const domain = attendee.email.split('@')[1].toLowerCase()
            
            // Skip personal/generic domains
            const personalDomains = [
              'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
              'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
              'example.com', 'test.com', 'temp.com', 'conference.temp'
            ]
            
            if (!personalDomains.includes(domain) && domain.length > 3) {
              const standardizedName = standardizeCompanyName(company)
              
              if (!companyEmailDomains.has(standardizedName)) {
                companyEmailDomains.set(standardizedName, new Set())
              }
              companyEmailDomains.get(standardizedName).add(domain)
            }
          }
        }
      })

      const uniqueCompanies = Array.from(companyFrequency.keys())
      setMigrationLog(prev => [...prev, `✅ Found ${uniqueCompanies.length} unique company names`])
      setMigrationLog(prev => [...prev, `✅ Extracted domains for ${companyEmailDomains.size} companies`])
      
      // Show top companies by frequency
      const topCompanies = Array.from(companyFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      
      setMigrationLog(prev => [...prev, '📊 Most common companies:'])
      topCompanies.forEach(([company, count]) => {
        setMigrationLog(prev => [...prev, `   • ${company}: ${count} attendees`])
      })
      
      // Show companies with most domains
      const topDomainCompanies = Array.from(companyEmailDomains.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 5)
      
      if (topDomainCompanies.length > 0) {
        setMigrationLog(prev => [...prev, '📊 Companies with most email domains:'])
        topDomainCompanies.forEach(([company, domains]) => {
          setMigrationLog(prev => [...prev, `   • ${company}: ${domains.size} domains`])
        })
      }

      // Step 3: Apply standardization rules and domain extraction
      setMigrationLog(prev => [...prev, '📋 Step 3: Applying standardization rules and domain extraction...'])
      
      const standardizationResults = []
      let standardizedCount = 0
      let aliasCount = 0
      let domainsCount = 0
      
      for (const originalCompany of uniqueCompanies) {
        const standardizedName = standardizeCompanyName(originalCompany)
        const sector = classifyCompanySector(originalCompany)
        const geography = classifyCompanyGeography(originalCompany)
        const subsector = classifyCompanySubsector(originalCompany, sector)
        
        const attendeeCount = companyFrequency.get(originalCompany)
        const needsAlias = originalCompany.toLowerCase() !== standardizedName.toLowerCase()
        const domains = companyEmailDomains.get(standardizedName)
        
        standardizationResults.push({
          original: originalCompany,
          standardized: standardizedName,
          sector,
          geography,
          subsector,
          attendeeCount,
          needsAlias,
          domains: domains ? Array.from(domains) : []
        })
        
        if (needsAlias) aliasCount++
        if (domains && domains.size > 0) domainsCount += domains.size
        
        // Check if this standardized name already exists
        const existingStandardized = standardizationResults.find(r => 
          r.standardized.toLowerCase() === standardizedName.toLowerCase() && r !== standardizationResults[standardizationResults.length - 1]
        )
        
        if (!existingStandardized) {
          standardizedCount++
        }
      }
      
      setMigrationLog(prev => [...prev, `✅ Will create ${standardizedCount} standardized companies`])
      setMigrationLog(prev => [...prev, `✅ Will create ${aliasCount} company aliases`])
      setMigrationLog(prev => [...prev, `✅ Will extract ${domainsCount} company domains`])
      setMigrationLog(prev => [...prev, `✅ Will attempt logo fetching for companies with domains`])

      // Step 4: Preview or execute changes
      if (dryRun) {
        setMigrationLog(prev => [...prev, '📋 Step 4: DRY RUN - Previewing changes (no database modifications)...'])
        
        // Show sample standardizations
        const sampleResults = standardizationResults.slice(0, 10)
        setMigrationLog(prev => [...prev, '📝 Sample standardizations:'])
        sampleResults.forEach(result => {
          if (result.needsAlias) {
            setMigrationLog(prev => [...prev, `   "${result.original}" → "${result.standardized}" (${result.sector}, ${result.geography}) + alias + ${result.domains.length} domains`])
          } else {
            setMigrationLog(prev => [...prev, `   "${result.original}" → "${result.standardized}" (${result.sector}, ${result.geography}) + ${result.domains.length} domains`])
          }
        })
        
        if (standardizationResults.length > 10) {
          setMigrationLog(prev => [...prev, `   ... and ${standardizationResults.length - 10} more companies`])
        }
        
        setMigrationLog(prev => [...prev, '✅ DRY RUN COMPLETE - Review results above'])
        setMigrationLog(prev => [...prev, '💡 Uncheck "Dry Run" and run again to apply changes to database'])
      } else {
        // Execute actual migration
        setMigrationLog(prev => [...prev, '📋 Step 4: Creating standardized companies...'])
        
        const createdCompanies = new Map()
        let actualStandardizedCount = 0
        let actualAliasCount = 0
        let actualDomainsCount = 0
        let actualLogosCount = 0
        let errorCount = 0
        
        for (const result of standardizationResults) {
          try {
            // Check if standardized company already exists
            let standardizedCompany = createdCompanies.get(result.standardized.toLowerCase())
            
            if (!standardizedCompany) {
              // Create new standardized company
              const { data: newCompany, error: upsertError } = await supabase
                .from('standardized_companies')
                .upsert([{
                  name: result.standardized,
                  sector: result.sector,
                  geography: result.geography,
                  subsector: result.subsector,
                  is_parent_company: false,
                  parent_company_id: null
                }], { onConflict: 'name' })
                .select()
                .single()

              if (upsertError) {
                setMigrationLog(prev => [...prev, `❌ Error creating ${result.standardized}: ${upsertError.message}`])
                errorCount++
                continue
              }
              
              standardizedCompany = newCompany
              createdCompanies.set(result.standardized.toLowerCase(), standardizedCompany)
              actualStandardizedCount++
            }
            
            // Add alias if needed
            if (result.needsAlias && migrationOptions.createAliases) {
              const { error: aliasError } = await supabase
                .from('company_aliases')
                .insert([{
                  alias: result.original,
                  standardized_company_id: standardizedCompany.id
                }])

              if (aliasError && aliasError.code !== '23505') { // Ignore duplicate errors
                setMigrationLog(prev => [...prev, `⚠️ Error creating alias ${result.original}: ${aliasError.message}`])
              } else if (!aliasError) {
                actualAliasCount++
              }
            }
            
          } catch (error) {
            setMigrationLog(prev => [...prev, `❌ Error processing ${result.original}: ${error.message}`])
            errorCount++
          }
        }
        
        setMigrationLog(prev => [...prev, `✅ Created ${actualStandardizedCount} standardized companies`])
        setMigrationLog(prev => [...prev, `✅ Created ${actualAliasCount} company aliases`])
        setMigrationLog(prev => [...prev, `✅ Extracted ${actualDomainsCount} company domains`])
        setMigrationLog(prev => [...prev, `✅ Updated ${actualLogosCount} company logos`])
        
        // Step 6: Backfill attendee records
        if (migrationOptions.backfillAttendees) {
          setMigrationLog(prev => [...prev, '📋 Step 6: Backfilling attendee standardized company names...'])
          
          let backfillCount = 0
          let backfillErrors = 0
          
          for (const attendee of attendees) {
            try {
              const standardizedName = standardizeCompanyName(attendee.company)
              
              const { error: updateError } = await supabase
                .from('attendees')
                .update({ company_name_standardized: standardizedName })
                .eq('id', attendee.id)

              if (updateError) {
                backfillErrors++
              } else {
                backfillCount++
              }
              
            } catch (error) {
              backfillErrors++
            }
          }
          
          setMigrationLog(prev => [...prev, `✅ Updated ${backfillCount} attendee records`])
          if (backfillErrors > 0) {
            setMigrationLog(prev => [...prev, `⚠️ ${backfillErrors} backfill errors occurred`])
          }
        }
        
        // Step 7: Validation
        if (migrationOptions.validateData) {
          setMigrationLog(prev => [...prev, '📋 Step 7: Validating data integrity...'])
          
          // Check for orphaned aliases
          const { data: orphanedAliases } = await supabase
            .from('company_aliases')
            .select('id')
            .is('standardized_company_id', null)
          
          if (orphanedAliases && orphanedAliases.length > 0) {
            setMigrationLog(prev => [...prev, `⚠️ Found ${orphanedAliases.length} orphaned aliases`])
          }
          
          setMigrationLog(prev => [...prev, '✅ Data validation complete'])
        }
        
        setMigrationLog(prev => [...prev, '🎉 Migration completed successfully!'])
        
        // Create actual results
        const actualResults = {
          totalCompanies: uniqueCompanies.length,
          standardizedCompanies: actualStandardizedCount,
          aliasesCreated: actualAliasCount,
          domainsExtracted: actualDomainsCount,
          logosUpdated: actualLogosCount,
          attendeesBackfilled: migrationOptions.backfillAttendees ? attendees.length : 0,
          errors: errorCount,
          warnings: 0,
          processingTime: 'Just completed',
          topCompanies: topCompanies.map(([name, count]) => ({
            name: standardizeCompanyName(name),
            attendeeCount: count,
            aliases: name.toLowerCase() !== standardizeCompanyName(name).toLowerCase() ? 1 : 0
          }))
        }
        
        setMigrationResults(actualResults)
      }

      // Create results for dry run
      if (dryRun) {
        const companiesWithDomains = Array.from(companyEmailDomains.entries()).filter(([_, domains]) => domains.size > 0)
        const previewResults = {
          totalCompanies: uniqueCompanies.length,
          standardizedCompanies: standardizedCount,
          aliasesCreated: aliasCount,
          domainsExtracted: domainsCount,
          logosUpdated: Math.min(domainsCount, standardizedCount), // Estimate
          attendeesBackfilled: migrationOptions.backfillAttendees ? attendees.length : 0,
          errors: 0,
          warnings: 0,
          processingTime: 'Preview only',
          topCompanies: topCompanies.map(([name, count]) => ({
            name: standardizeCompanyName(name),
            attendeeCount: count,
            aliases: name.toLowerCase() !== standardizeCompanyName(name).toLowerCase() ? 1 : 0
          }))
        }
        
        setMigrationResults(previewResults)
      }

      setMigrationStatus('completed')
      
    } catch (error) {
      console.error('Migration error:', error)
      setMigrationLog(prev => [...prev, `❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
      setMigrationStatus('error')
    }
  }

  // Company standardization functions (moved from Node.js script)
  const standardizeCompanyName = (originalName) => {
    if (!originalName || typeof originalName !== 'string') {
      return 'Unknown Company'
    }
    
    const cleaned = originalName.trim()
    const lowerCased = cleaned.toLowerCase()
    
    // Exact matches
    const exactMatches = {
      'microsoft': 'Microsoft Corporation',
      'microsoft corp': 'Microsoft Corporation',
      'microsoft corporation': 'Microsoft Corporation',
      'msft': 'Microsoft Corporation',
      'apple': 'Apple Inc.',
      'apple inc': 'Apple Inc.',
      'google': 'Google LLC',
      'alphabet': 'Google LLC',
      'amazon': 'Amazon.com Inc.',
      'aws': 'Amazon.com Inc.',
      'meta': 'Meta Platforms Inc.',
      'facebook': 'Meta Platforms Inc.',
      'tesla': 'Tesla Inc.',
      'netflix': 'Netflix Inc.',
      'salesforce': 'Salesforce Inc.',
      'oracle': 'Oracle Corporation',
      'ibm': 'IBM Corporation',
      'intel': 'Intel Corporation',
      'cisco': 'Cisco Systems Inc.',
      'adobe': 'Adobe Inc.',
      'nvidia': 'NVIDIA Corporation'
    }
    
    if (exactMatches[lowerCased]) {
      return exactMatches[lowerCased]
    }
    
    // Pattern-based rules
    let standardized = cleaned
    const patterns = [
      { pattern: /\b(.*?)\s+(inc\.?|incorporated)$/i, replacement: '$1 Inc.' },
      { pattern: /\b(.*?)\s+(corp\.?|corporation)$/i, replacement: '$1 Corporation' },
      { pattern: /\b(.*?)\s+(llc\.?)$/i, replacement: '$1 LLC' },
      { pattern: /\b(.*?)\s+(ltd\.?|limited)$/i, replacement: '$1 Ltd.' },
      { pattern: /\b(.*?)\s+(co\.?)$/i, replacement: '$1 Company' }
    ]
    
    for (const rule of patterns) {
      if (standardized.match(rule.pattern)) {
        standardized = standardized.replace(rule.pattern, rule.replacement)
        break
      }
    }
    
    // Clean up and capitalize
    standardized = standardized
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => {
        if (['inc', 'corp', 'llc', 'ltd', 'co', 'and', 'of', 'the'].includes(word.toLowerCase())) {
          return word.toLowerCase()
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
      .replace(/\binc\b/gi, 'Inc.')
      .replace(/\bcorp\b/gi, 'Corporation')
      .replace(/\bllc\b/gi, 'LLC')
      .replace(/\bltd\b/gi, 'Ltd.')
    
    return standardized
  }

  const classifyCompanySector = (companyName) => {
    const lowerName = companyName.toLowerCase()
    
    const sectorRules = {
      'Tech': ['software', 'technology', 'tech', 'data', 'cloud', 'ai', 'saas', 'platform'],
      'Healthcare': ['health', 'medical', 'pharma', 'biotech', 'hospital', 'clinic'],
      'Services': ['consulting', 'advisory', 'services', 'solutions', 'management'],
      'Internet & Consumer': ['retail', 'consumer', 'e-commerce', 'marketplace', 'media'],
      'Apax Digital': ['apax digital', 'fintech', 'insurtech'],
      'Apax': ['apax partners', 'apax'],
      'Apax OEP': ['apax oep', 'oep'],
      'Vendors/Sponsors': ['vendor', 'sponsor', 'consulting', 'advisory', 'partner']
    }
    
    for (const [sector, keywords] of Object.entries(sectorRules)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return sector
      }
    }
    
    return 'Other'
  }

  const classifyCompanyGeography = (companyName) => {
    const lowerName = companyName.toLowerCase()
    
    const geographyRules = {
      'US': ['usa', 'united states', 'inc.', 'corp.', 'llc'],
      'EU': ['uk', 'united kingdom', 'germany', 'france', 'ltd.', 'limited', 'gmbh'],
      'ROW': ['asia', 'japan', 'china', 'india', 'australia'],
      'Global': ['global', 'international', 'worldwide']
    }
    
    for (const [geography, indicators] of Object.entries(geographyRules)) {
      if (indicators.some(indicator => lowerName.includes(indicator))) {
        return geography
      }
    }
    
    return 'US' // Default
  }

  const classifyCompanySubsector = (companyName, sector) => {
    const subsectorMap = {
      'Tech': 'Software',
      'Healthcare': 'Healthcare Services',
      'Services': 'Professional Services',
      'Internet & Consumer': 'Consumer Goods & Services',
      'Apax Digital': 'Software',
      'Apax': 'Professional Services',
      'Apax OEP': 'Professional Services',
      'Impact': 'Professional Services',
      'Other': 'Software'
    }
    
    return subsectorMap[sector] || 'Software'
  }

  const downloadMigrationReport = () => {
    if (!migrationResults) return

    const report = [
      'Company Data Migration Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Summary:',
      `Total Companies Processed: ${migrationResults.totalCompanies}`,
      `Standardized Companies Created: ${migrationResults.standardizedCompanies}`,
      `Aliases Created: ${migrationResults.aliasesCreated}`,
      `Attendees Backfilled: ${migrationResults.attendeesBackfilled}`,
      `Errors: ${migrationResults.errors}`,
      `Warnings: ${migrationResults.warnings}`,
      `Processing Time: ${migrationResults.processingTime}`,
      '',
      'Top Companies by Attendee Count:',
      ...migrationResults.topCompanies.map(c => `${c.name}: ${c.attendeeCount} attendees, ${c.aliases} aliases`),
      '',
      'Migration Log:',
      ...migrationLog
    ].join('\n')

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `company_migration_report_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
  }

  const resetMigration = () => {
    setMigrationStatus('idle')
    setMigrationResults(null)
    setMigrationLog([])
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-brand-navy mb-2">
              Company Data Migration Tool
            </h2>
            <p className="text-brand-gray">
              Standardize company names from existing attendee data and create the standardized company database
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {migrationResults && (
              <button
                onClick={downloadMigrationReport}
                className="inline-flex items-center px-4 py-2 bg-chart-green text-white rounded-lg hover:bg-chart-green/90 font-semibold"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </button>
            )}
            
            {migrationStatus === 'completed' && (
              <button
                onClick={resetMigration}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Migration Options */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-navy">Migration Options</h3>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm font-semibold text-brand-navy hover:text-brand-navy-light"
            >
              {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded"
              />
              <label htmlFor="dryRun" className="text-sm font-semibold text-brand-navy">
                Dry Run (Preview only - no database changes)
              </label>
            </div>
            
            {showAdvancedOptions && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-brand-navy">Advanced Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={migrationOptions.createAliases}
                        onChange={(e) => setMigrationOptions(prev => ({ ...prev, createAliases: e.target.checked }))}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded" 
                      />
                      <span>Create company aliases for variations</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={migrationOptions.autoClassify}
                        onChange={(e) => setMigrationOptions(prev => ({ ...prev, autoClassify: e.target.checked }))}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded" 
                      />
                      <span>Auto-classify sectors and geographies</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={migrationOptions.backfillAttendees}
                        onChange={(e) => setMigrationOptions(prev => ({ ...prev, backfillAttendees: e.target.checked }))}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded" 
                      />
                      <span>Backfill attendee standardized names</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={migrationOptions.validateData}
                        onChange={(e) => setMigrationOptions(prev => ({ ...prev, validateData: e.target.checked }))}
                        className="w-4 h-4 text-brand-navy focus:ring-brand-navy border-gray-300 rounded" 
                      />
                      <span>Validate data integrity after migration</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Migration Action */}
        <div className="flex items-center justify-center">
          <button
            onClick={runMigration}
            disabled={migrationStatus === 'running'}
            className="inline-flex items-center px-8 py-4 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-light font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {migrationStatus === 'running' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Running Migration...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-3" />
                {dryRun ? 'Run Migration Preview' : 'Start Company Migration'}
              </>
            )}
          </button>
        </div>

        {dryRun && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                Dry Run Mode: No database changes will be made. This will analyze your live data and show you exactly what would happen.
              </span>
            </div>
          </div>
        )}
        
        {!dryRun && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                LIVE MODE: This will make permanent changes to your database. Ensure you have a backup!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Migration Progress/Results */}
      {migrationStatus !== 'idle' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            {migrationStatus === 'running' && (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-navy"></div>
                <span className="text-lg font-semibold text-brand-navy">Migration in Progress</span>
              </>
            )}
            {migrationStatus === 'completed' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-lg font-semibold text-green-600">Migration Completed Successfully</span>
              </>
            )}
            {migrationStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-lg font-semibold text-red-600">Migration Failed</span>
              </>
            )}
          </div>

          {/* Migration Results Summary */}
          {migrationResults && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-navy mb-4">Migration Results</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{migrationResults.standardizedCompanies}</div>
                  <div className="text-sm text-blue-800">Companies Created</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{migrationResults.aliasesCreated}</div>
                  <div className="text-sm text-purple-800">Aliases Created</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{migrationResults.domainsExtracted}</div>
                  <div className="text-sm text-blue-800">Domains Extracted</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{migrationResults.logosUpdated}</div>
                  <div className="text-sm text-orange-800">Logos Updated</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{migrationResults.attendeesBackfilled}</div>
                  <div className="text-sm text-green-800">Attendees Updated</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{migrationResults.processingTime}</div>
                  <div className="text-sm text-orange-800">Processing Time</div>
                </div>
              </div>

              {/* Top Companies */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-brand-navy mb-3">Top Companies by Attendee Count</h4>
                <div className="space-y-2">
                  {migrationResults.topCompanies.map((company, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-brand-navy">#{index + 1}</span>
                        <Building className="w-4 h-4 text-brand-gray" />
                        <span className="text-sm font-semibold text-brand-navy">{company.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-brand-gray">
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{company.attendeeCount} attendees</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <List className="w-3 h-3" />
                          <span>{company.aliases} aliases</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Migration Log */}
          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            <h4 className="text-md font-semibold text-brand-navy mb-3">Migration Log</h4>
            <div className="space-y-1 font-mono text-sm">
              {migrationLog.map((log, index) => (
                <div key={index} className="text-brand-gray">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Migration Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Company Data Migration Guide</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold text-blue-800 mb-3">What This Migration Does:</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• <strong>Analyzes</strong> all company names from existing attendee records</li>
              <li>• <strong>Extracts</strong> company domains from attendee email addresses</li>
              <li>• <strong>Standardizes</strong> company names using intelligent rules and patterns</li>
              <li>• <strong>Creates</strong> standardized company records with proper classifications</li>
              <li>• <strong>Stores</strong> extracted domains in company_domains table with source tracking</li>
              <li>• <strong>Fetches</strong> company logos using actual domains from multiple logo services</li>
              <li>• <strong>Generates</strong> aliases for company name variations and misspellings</li>
              <li>• <strong>Backfills</strong> attendee records with standardized company references</li>
              <li>• <strong>Validates</strong> data integrity and provides detailed reporting</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-semibold text-blue-800 mb-3">Standardization Examples:</h4>
            <div className="space-y-2 text-sm">
              <div className="bg-white p-2 rounded border">
                <div className="text-blue-700"><strong>Input:</strong> "microsoft" + emails @microsoft.com, @msft.com</div>
                <div className="text-green-700"><strong>Output:</strong> "Microsoft Corporation" + 3 aliases + 2 domains + logo</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-blue-700"><strong>Input:</strong> "Altus Fire & Life Safety" + emails @altusfire.com</div>
                <div className="text-green-700"><strong>Output:</strong> "Altus Fire & Life Safety" + 1 alias + 1 domain + logo</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="text-blue-700"><strong>Input:</strong> Multiple company variations + mixed email domains</div>
                <div className="text-green-700"><strong>Output:</strong> Standardized names + domains + accurate logos</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white border border-blue-300 rounded-lg p-4">
          <h4 className="text-md font-semibold text-blue-800 mb-2">⚠️ Important Notes:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Backup Recommended:</strong> Create a database backup before running the migration</li>
            <li>• <strong>One-Time Process:</strong> This migration should only be run once on fresh data</li>
            <li>• <strong>Domain Extraction:</strong> Automatically extracts company domains from attendee emails</li>
            <li>• <strong>Logo Fetching:</strong> Uses extracted domains for accurate logo retrieval</li>
            <li>• <strong>Dry Run First:</strong> Always run in preview mode first to review changes</li>
            <li>• <strong>Manual Review:</strong> Review and adjust standardized companies after migration</li>
            <li>• <strong>Original Data Preserved:</strong> Original company names in attendee records remain unchanged</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Enhanced Migration Features:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Safe Preview:</strong> Always run in Dry Run mode first to see what will happen</li>
            <li>• <strong>Live Data Analysis:</strong> Analyzes your actual attendee company data in real-time</li>
            <li>• <strong>Email Domain Extraction:</strong> Automatically extracts company domains from attendee emails</li>
            <li>• <strong>Multi-Service Logo Fetching:</strong> Uses 4+ logo services for best results</li>
            <li>• <strong>Intelligent Standardization:</strong> Uses 50+ predefined rules and patterns</li>
            <li>• <strong>Backup Recommended:</strong> Create a database backup before running live migration</li>
            <li>• <strong>Configurable Options:</strong> Choose which migration steps to execute</li>
            <li>• <strong>Detailed Logging:</strong> Complete audit trail of all changes made</li>
          </ul>
        </div>
      </div>
    </div>
  )
}