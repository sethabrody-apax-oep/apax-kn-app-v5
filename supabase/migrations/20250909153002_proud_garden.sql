/*
  # Company Standardization Trigger

  1. Functions
    - `standardize_attendee_company()` - Automatically standardizes company names when attendees are inserted/updated
    - Handles exact matches, alias lookups, and fuzzy matching
    - Creates new standardized companies when no match is found

  2. Triggers
    - `trigger_standardize_attendee_company` - Fires on INSERT/UPDATE of attendees.company
    - Automatically populates company_name_standardized field

  3. Features
    - Smart company name matching (exact, alias, fuzzy)
    - Automatic standardized company creation
    - Maintains data consistency
*/

-- Function to standardize company names for attendees
CREATE OR REPLACE FUNCTION standardize_attendee_company()
RETURNS TRIGGER AS $$
DECLARE
    standardized_name TEXT;
    company_record RECORD;
BEGIN
    -- Only process if company field has changed or is being set
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.company IS DISTINCT FROM NEW.company) THEN
        
        -- Skip if company is empty
        IF NEW.company IS NULL OR trim(NEW.company) = '' THEN
            NEW.company_name_standardized := NULL;
            RETURN NEW;
        END IF;
        
        -- Clean the company name
        standardized_name := trim(NEW.company);
        
        -- Try to find existing standardized company
        SELECT sc.name INTO company_record
        FROM standardized_companies sc
        WHERE LOWER(sc.name) = LOWER(standardized_name)
        LIMIT 1;
        
        -- If not found, check aliases
        IF company_record IS NULL THEN
            SELECT sc.name INTO company_record
            FROM standardized_companies sc
            JOIN company_aliases ca ON sc.id = ca.standardized_company_id
            WHERE LOWER(ca.alias) = LOWER(standardized_name)
            LIMIT 1;
        END IF;
        
        -- If still not found, try fuzzy matching (similar names)
        IF company_record IS NULL THEN
            SELECT sc.name INTO company_record
            FROM standardized_companies sc
            WHERE similarity(LOWER(sc.name), LOWER(standardized_name)) > 0.8
            ORDER BY similarity(LOWER(sc.name), LOWER(standardized_name)) DESC
            LIMIT 1;
        END IF;
        
        -- If found, use the standardized name
        IF company_record IS NOT NULL THEN
            NEW.company_name_standardized := company_record.name;
        ELSE
            -- Create new standardized company with default values
            INSERT INTO standardized_companies (
                name,
                sector,
                geography,
                subsector,
                is_parent_company
            ) VALUES (
                standardized_name,
                'Other', -- Default sector
                'Global', -- Default geography
                'Professional Services', -- Default subsector
                false
            );
            
            NEW.company_name_standardized := standardized_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attendee company standardization
DROP TRIGGER IF EXISTS trigger_standardize_attendee_company ON attendees;
CREATE TRIGGER trigger_standardize_attendee_company
    BEFORE INSERT OR UPDATE OF company ON attendees
    FOR EACH ROW
    EXECUTE FUNCTION standardize_attendee_company();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_attendees_company_name_standardized 
ON attendees (company_name_standardized);