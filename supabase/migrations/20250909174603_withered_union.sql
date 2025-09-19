/*
  # Add Not Applicable subsector option

  1. Database Changes
    - Update subsector constraint to include "Not Applicable" option
    
  2. Purpose
    - Allows companies to have "Not Applicable" as a subsector when specific categorization doesn't apply
    - Provides flexibility for companies that don't fit standard subsector classifications
*/

-- Update the subsector constraint to include "Not Applicable"
ALTER TABLE public.standardized_companies 
DROP CONSTRAINT IF EXISTS chk_subsector;

ALTER TABLE public.standardized_companies 
ADD CONSTRAINT chk_subsector CHECK ((subsector = ANY (ARRAY[
  'Not Applicable'::text,
  'Consumer Goods & Services'::text, 
  'Density Driven Businesses'::text, 
  'Healthcare Adjacencies'::text, 
  'Healthcare Services'::text, 
  'Legacy Media'::text, 
  'Medtech'::text, 
  'Online Marketplaces'::text, 
  'Outsourced Sales and Marketing'::text, 
  'Pharma'::text, 
  'Professional Services'::text, 
  'Residential Services'::text, 
  'Software'::text, 
  'Tech-Enabled Services'::text, 
  'Telecom'::text
])));