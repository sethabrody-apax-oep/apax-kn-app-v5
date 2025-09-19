/*
  # Add company_name_standardized column to attendees table

  1. Changes
    - Add `company_name_standardized` column to `attendees` table
    - This will store the standardized company name after alias resolution
    - Initially NULL, will be populated by triggers and migration scripts

  2. Notes
    - This column will be automatically populated by the standardization trigger
    - Allows for reporting and filtering by standardized company names
    - Maintains original company name in existing `company` column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'company_name_standardized'
  ) THEN
    ALTER TABLE public.attendees ADD COLUMN company_name_standardized TEXT;
  END IF;
END $$;

-- Create index for performance on the new column
CREATE INDEX IF NOT EXISTS idx_attendees_company_name_standardized ON public.attendees (company_name_standardized);