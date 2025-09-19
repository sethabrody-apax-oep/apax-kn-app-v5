/*
  # Update domain sync function with proper conflict handling

  1. Function Updates
    - Replace `sync_company_domains_from_emails` function completely
    - Add proper ON CONFLICT handling for duplicate domains
    - Improve error handling and return meaningful results
    - Add logging for debugging

  2. Changes
    - Use ON CONFLICT (domain) DO NOTHING to handle duplicates gracefully
    - Return counts of inserted vs skipped domains
    - Add better error handling within the function
*/

-- Drop and recreate the function with proper conflict handling
DROP FUNCTION IF EXISTS sync_company_domains_from_emails();

CREATE OR REPLACE FUNCTION sync_company_domains_from_emails()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_record RECORD;
  company_record RECORD;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  error_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Extract unique domains from attendee emails, excluding personal email providers
  FOR domain_record IN
    SELECT DISTINCT 
      LOWER(SPLIT_PART(email, '@', 2)) as domain,
      COUNT(*) as attendee_count
    FROM attendees 
    WHERE email IS NOT NULL 
      AND email LIKE '%@%'
      AND LOWER(SPLIT_PART(email, '@', 2)) NOT IN (
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'aol.com', 'icloud.com', 'me.com', 'mac.com',
        'live.com', 'msn.com', 'ymail.com', 'rocketmail.com'
      )
      AND LENGTH(SPLIT_PART(email, '@', 2)) > 0
    GROUP BY LOWER(SPLIT_PART(email, '@', 2))
    HAVING COUNT(*) > 0
  LOOP
    BEGIN
      -- Try to find a matching standardized company by domain or alias
      SELECT sc.id, sc.name INTO company_record
      FROM standardized_companies sc
      LEFT JOIN company_domains cd ON cd.standardized_company_id = sc.id
      LEFT JOIN company_aliases ca ON ca.standardized_company_id = sc.id
      WHERE cd.domain = domain_record.domain
         OR LOWER(ca.alias) LIKE '%' || domain_record.domain || '%'
         OR LOWER(sc.name) LIKE '%' || REPLACE(domain_record.domain, '.com', '') || '%'
      LIMIT 1;

      -- If we found a matching company, try to insert the domain
      IF company_record.id IS NOT NULL THEN
        INSERT INTO company_domains (
          standardized_company_id,
          domain,
          source,
          is_primary
        ) VALUES (
          company_record.id,
          domain_record.domain,
          'email_extraction',
          false
        )
        ON CONFLICT (domain) DO NOTHING;
        
        -- Check if the insert actually happened
        IF FOUND THEN
          inserted_count := inserted_count + 1;
        ELSE
          skipped_count := skipped_count + 1;
        END IF;
      ELSE
        skipped_count := skipped_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      -- Log the error but continue processing
      RAISE NOTICE 'Error processing domain %: %', domain_record.domain, SQLERRM;
    END;
  END LOOP;

  -- Return summary
  result := jsonb_build_object(
    'success', true,
    'inserted', inserted_count,
    'skipped', skipped_count,
    'errors', error_count,
    'message', format('Domain extraction completed: %s inserted, %s skipped, %s errors', 
                     inserted_count, skipped_count, error_count)
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Domain extraction failed: ' || SQLERRM
  );
END;
$$;