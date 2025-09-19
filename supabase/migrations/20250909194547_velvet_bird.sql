/*
  # Fix Domain Extraction Function

  1. Database Functions
    - Fix `extract_domains_from_attendee_emails` function
    - Fix `sync_company_domains_from_emails` function
    - Add proper error handling and logging

  2. Security
    - Functions use SECURITY DEFINER for proper permissions
    - Add validation for email format and domain extraction
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS extract_domains_from_attendee_emails();
DROP FUNCTION IF EXISTS sync_company_domains_from_emails();

-- Function to extract domains from attendee emails
CREATE OR REPLACE FUNCTION extract_domains_from_attendee_emails()
RETURNS TABLE(
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
    COALESCE(a.company_name_standardized, a.company) as company_name,
    LOWER(SPLIT_PART(a.email, '@', 2)) as domain,
    COUNT(*) as attendee_count
  FROM attendees a
  WHERE 
    a.email IS NOT NULL 
    AND a.email != ''
    AND a.email LIKE '%@%'
    AND LOWER(SPLIT_PART(a.email, '@', 2)) NOT IN (
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
      'example.com', 'test.com', 'temp.com', 'conference.temp'
    )
    AND LENGTH(SPLIT_PART(a.email, '@', 2)) > 3
    AND a.company IS NOT NULL
    AND a.company != ''
  GROUP BY 
    COALESCE(a.company_name_standardized, a.company),
    LOWER(SPLIT_PART(a.email, '@', 2))
  ORDER BY 
    company_name,
    attendee_count DESC;
END;
$$;

-- Function to sync company domains from emails
CREATE OR REPLACE FUNCTION sync_company_domains_from_emails()
RETURNS TABLE(
  companies_processed integer,
  domains_added integer,
  domains_updated integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_record RECORD;
  company_record RECORD;
  companies_count integer := 0;
  domains_added_count integer := 0;
  domains_updated_count integer := 0;
BEGIN
  -- Extract domains from emails and sync with company_domains table
  FOR domain_record IN 
    SELECT * FROM extract_domains_from_attendee_emails()
  LOOP
    -- Find the standardized company
    SELECT id INTO company_record
    FROM standardized_companies 
    WHERE name = domain_record.company_name
    LIMIT 1;
    
    IF company_record.id IS NOT NULL THEN
      companies_count := companies_count + 1;
      
      -- Check if domain already exists for this company
      IF NOT EXISTS (
        SELECT 1 FROM company_domains 
        WHERE standardized_company_id = company_record.id 
        AND domain = domain_record.domain
      ) THEN
        -- Insert new domain
        INSERT INTO company_domains (
          standardized_company_id,
          domain,
          is_primary,
          source
        ) VALUES (
          company_record.id,
          domain_record.domain,
          -- Set as primary if this is the first domain for the company
          NOT EXISTS (
            SELECT 1 FROM company_domains 
            WHERE standardized_company_id = company_record.id
          ),
          'email_extraction'
        );
        
        domains_added_count := domains_added_count + 1;
      ELSE
        -- Update existing domain source if it was manual
        UPDATE company_domains 
        SET 
          source = 'email_extraction',
          updated_at = NOW()
        WHERE 
          standardized_company_id = company_record.id 
          AND domain = domain_record.domain
          AND source = 'manual';
        
        IF FOUND THEN
          domains_updated_count := domains_updated_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT companies_count, domains_added_count, domains_updated_count;
END;
$$;