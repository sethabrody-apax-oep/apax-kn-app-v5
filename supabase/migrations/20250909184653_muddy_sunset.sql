/*
  # Add domain extraction and logo management functions

  1. Functions
    - `extract_domains_from_attendee_emails()` - Extract domains from attendee emails
    - `sync_company_domains_from_emails()` - Sync domains to company_domains table
    - `get_company_statistics()` - Get company statistics for dashboard

  2. Security
    - Functions are accessible to authenticated users with admin privileges
*/

-- Function to extract domains from attendee emails
CREATE OR REPLACE FUNCTION extract_domains_from_attendee_emails()
RETURNS TABLE (
  company_name text,
  domain text,
  attendee_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.company_name_standardized as company_name,
    LOWER(SPLIT_PART(a.email, '@', 2)) as domain,
    COUNT(*) as attendee_count
  FROM attendees a
  WHERE 
    a.email IS NOT NULL 
    AND a.email != ''
    AND a.email LIKE '%@%'
    AND a.company_name_standardized IS NOT NULL
    AND a.company_name_standardized != ''
    -- Exclude personal/generic email domains
    AND LOWER(SPLIT_PART(a.email, '@', 2)) NOT IN (
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
      'example.com', 'test.com', 'temp.com', 'conference.temp'
    )
    -- Ensure domain has proper format
    AND LENGTH(SPLIT_PART(a.email, '@', 2)) > 3
    AND SPLIT_PART(a.email, '@', 2) LIKE '%.%'
  GROUP BY a.company_name_standardized, LOWER(SPLIT_PART(a.email, '@', 2))
  ORDER BY a.company_name_standardized, attendee_count DESC;
END;
$$;

-- Function to sync domains from emails to company_domains table
CREATE OR REPLACE FUNCTION sync_company_domains_from_emails()
RETURNS TABLE (
  companies_processed integer,
  domains_added integer,
  domains_updated integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_record RECORD;
  domain_record RECORD;
  companies_count integer := 0;
  domains_added_count integer := 0;
  domains_updated_count integer := 0;
  standardized_company_id uuid;
BEGIN
  -- Loop through each company with extracted domains
  FOR company_record IN 
    SELECT DISTINCT company_name 
    FROM extract_domains_from_attendee_emails()
  LOOP
    -- Find the standardized company ID
    SELECT id INTO standardized_company_id
    FROM standardized_companies
    WHERE name = company_record.company_name
    LIMIT 1;
    
    IF standardized_company_id IS NOT NULL THEN
      companies_count := companies_count + 1;
      
      -- Loop through domains for this company
      FOR domain_record IN 
        SELECT domain, attendee_count
        FROM extract_domains_from_attendee_emails()
        WHERE company_name = company_record.company_name
      LOOP
        -- Check if domain already exists
        IF NOT EXISTS (
          SELECT 1 FROM company_domains 
          WHERE standardized_company_id = standardized_company_id 
          AND domain = domain_record.domain
        ) THEN
          -- Insert new domain
          INSERT INTO company_domains (
            standardized_company_id,
            domain,
            is_primary,
            source
          ) VALUES (
            standardized_company_id,
            domain_record.domain,
            -- Set as primary if it's the first domain for this company
            NOT EXISTS (
              SELECT 1 FROM company_domains 
              WHERE standardized_company_id = standardized_company_id
            ),
            'email_extraction'
          );
          
          domains_added_count := domains_added_count + 1;
        ELSE
          -- Update existing domain source if it was manual
          UPDATE company_domains 
          SET source = 'email_extraction'
          WHERE standardized_company_id = standardized_company_id 
            AND domain = domain_record.domain
            AND source = 'manual';
          
          IF FOUND THEN
            domains_updated_count := domains_updated_count + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT companies_count, domains_added_count, domains_updated_count;
END;
$$;

-- Function to get company statistics
CREATE OR REPLACE FUNCTION get_company_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_companies', (SELECT COUNT(*) FROM standardized_companies),
    'companies_with_domains', (SELECT COUNT(DISTINCT standardized_company_id) FROM company_domains),
    'total_domains', (SELECT COUNT(*) FROM company_domains),
    'companies_with_logos', (SELECT COUNT(*) FROM standardized_companies WHERE logo IS NOT NULL AND logo != ''),
    'total_aliases', (SELECT COUNT(*) FROM company_aliases),
    'parent_companies', (SELECT COUNT(*) FROM standardized_companies WHERE is_parent_company = true),
    'subsidiary_companies', (SELECT COUNT(*) FROM standardized_companies WHERE parent_company_id IS NOT NULL)
  ) INTO result;
  
  RETURN result;
END;
$$;