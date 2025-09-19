/*
  # Apax Partner Assignment Limit Trigger

  1. Function
    - `check_apax_partner_limit()` - Enforces maximum 3 Apax partners per company
    - Validates that assigned attendees are actually Apax IP or Apax OEP
    - Provides clear error messages for limit violations

  2. Trigger
    - `trigger_check_apax_partner_limit` - Fires BEFORE INSERT on company_apax_partners
    - Prevents exceeding the 3-partner limit per company

  3. Validation
    - Checks attendee has apaxIP or apaxOEP attributes
    - Counts existing assignments for the company
    - Blocks assignment if limit would be exceeded
*/

-- Function to check Apax partner assignment limits
CREATE OR REPLACE FUNCTION check_apax_partner_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    attendee_record RECORD;
BEGIN
    -- Get the attendee record to validate they are Apax IP or OEP
    SELECT * INTO attendee_record
    FROM attendees
    WHERE id = NEW.attendee_id;
    
    -- Check if attendee exists
    IF attendee_record IS NULL THEN
        RAISE EXCEPTION 'Attendee with ID % does not exist', NEW.attendee_id;
    END IF;
    
    -- Validate that the attendee is Apax IP or Apax OEP
    IF NOT (
        (attendee_record.attributes->>'apaxIP')::boolean = true OR
        (attendee_record.attributes->>'apaxOEP')::boolean = true OR
        attendee_record.is_apax_ep = true
    ) THEN
        RAISE EXCEPTION 'Only Apax IP or Apax OEP attendees can be assigned as responsible partners. Attendee: % %', 
            attendee_record.first_name, attendee_record.last_name;
    END IF;
    
    -- Count current Apax partner assignments for this company
    SELECT COUNT(*) INTO current_count
    FROM company_apax_partners
    WHERE standardized_company_id = NEW.standardized_company_id;
    
    -- Check if adding this assignment would exceed the limit
    IF current_count >= 3 THEN
        RAISE EXCEPTION 'Cannot assign more than 3 Apax partners per company. Company already has % partners assigned.', current_count;
    END IF;
    
    -- Check if this attendee is already assigned to this company
    IF EXISTS (
        SELECT 1 FROM company_apax_partners
        WHERE standardized_company_id = NEW.standardized_company_id
        AND attendee_id = NEW.attendee_id
    ) THEN
        RAISE EXCEPTION 'Attendee % % is already assigned as a responsible partner for this company', 
            attendee_record.first_name, attendee_record.last_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Apax partner limit checking
DROP TRIGGER IF EXISTS trigger_check_apax_partner_limit ON company_apax_partners;
CREATE TRIGGER trigger_check_apax_partner_limit
    BEFORE INSERT ON company_apax_partners
    FOR EACH ROW
    EXECUTE FUNCTION check_apax_partner_limit();

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_company 
ON company_apax_partners (standardized_company_id);

CREATE INDEX IF NOT EXISTS idx_company_apax_partners_attendee 
ON company_apax_partners (attendee_id);