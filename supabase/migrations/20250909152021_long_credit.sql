/*
  # Add Company Name Standardized Column to Attendees

  1. Table Changes
    - Add `company_name_standardized` column to `attendees` table
    - This will link to the standardized company name for consistent reporting

  2. Indexes
    - Add index on company_name_standardized for performance
*/

-- Add the standardized company name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'company_name_standardized'
  ) THEN
    ALTER TABLE public.attendees ADD COLUMN company_name_standardized text;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendees_company_name_standardized 
ON public.attendees (company_name_standardized);