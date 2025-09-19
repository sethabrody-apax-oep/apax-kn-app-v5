/*
  # Update Altus Fire & Life Safety Company Standardization

  This migration updates the company_name_standardized field for attendees 
  from "Altus Fire & Life Safety" and its variations to use the proper 
  standardized company name.

  1. Updates
     - Update attendees with "Altus Fire and Life Safety" variations
     - Set company_name_standardized to the parent company name
     - Handle both "and" and "&" variations

  2. Validation
     - Verify updates were applied correctly
     - Check that standardized names are consistent
*/

-- Update attendees with Altus Fire variations to use standardized name
UPDATE public.attendees 
SET company_name_standardized = 'Altus Fire & Life Safety'
WHERE company ILIKE '%altus%fire%' 
  AND company ILIKE '%life%safety%'
  AND (company_name_standardized IS NULL 
       OR company_name_standardized != 'Altus Fire & Life Safety');

-- Verify the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.attendees 
    WHERE company ILIKE '%altus%fire%' 
      AND company ILIKE '%life%safety%'
      AND company_name_standardized = 'Altus Fire & Life Safety';
    
    RAISE NOTICE 'Updated % attendee records with standardized Altus company name', updated_count;
END $$;