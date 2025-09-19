/*
  # Add Vendors/Sponsors sector option

  1. Schema Changes
    - Update the sector constraint to include 'Vendors/Sponsors' as a valid option
    
  2. Data Integrity
    - Maintains existing constraint validation
    - Allows new sector classification for vendor and sponsor companies
*/

-- Update the sector constraint to include the new Vendors/Sponsors option
ALTER TABLE public.standardized_companies 
DROP CONSTRAINT IF EXISTS chk_sector;

ALTER TABLE public.standardized_companies 
ADD CONSTRAINT chk_sector 
CHECK ((sector = ANY (ARRAY[
  'Apax Digital'::text, 
  'Services'::text, 
  'Internet & Consumer'::text, 
  'Tech'::text, 
  'Healthcare'::text, 
  'Apax'::text, 
  'Apax OEP'::text, 
  'Impact'::text, 
  'Vendors/Sponsors'::text,
  'Other'::text
])));