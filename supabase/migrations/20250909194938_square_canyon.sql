/*
  # Fix Domain Extraction Conflicts

  1. Updates
    - Modify sync_company_domains_from_emails function to handle duplicate domains gracefully
    - Use ON CONFLICT DO NOTHING to prevent unique constraint violations
    - Add better error handling and logging
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS sync_company_domains_from_emails(uuid);

-- Create improved function that handles conflicts
CREATE OR REPLACE FUNCTION sync_company_domains_from_emails(target_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_record RECORD;
  inserted_count INTEGER := 0;
  skipped_count INTEGER := 0;
  error_count INTEGER := 0;
  result jsonb;
BEGIN
  -- Extract domains from attendee emails for the target company
  FOR domain_record IN
    SELECT DISTINCT 
      LOWER(SPLIT_PART(email, '@', 2)) as domain
    FROM attendees 
    WHERE company_name_standardized = (
      SELECT name FROM standardized_companies WHERE id = target_company_id
    )
    AND email IS NOT NULL 
    AND email != ''
    AND SPLIT_PART(email, '@', 2) NOT IN (
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'me.com', 'mac.com',
      'live.com', 'msn.com', 'comcast.net', 'verizon.net'
    )
    AND SPLIT_PART(email, '@', 2) != ''
  LOOP
    BEGIN
      -- Try to insert the domain, ignore if it already exists
      INSERT INTO company_domains (
        standardized_company_id,
        domain,
        source,
        is_primary
      ) VALUES (
        target_company_id,
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
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error inserting domain %: %', domain_record.domain, SQLERRM;
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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to extract domains from emails'
  );
END;
$$;