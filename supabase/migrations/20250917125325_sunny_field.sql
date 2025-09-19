/*
  # Standardize Fund Affiliation Data

  1. Purpose
    - Standardizes inconsistent fund affiliation values in attendees.attributes
    - Converts variants like "Fund:buyout", "Fund: Buyout Funds" to canonical "buyout"
    - Ensures consistent data format across the application

  2. Changes
    - Updates attendees table attributes.fundAffiliation field
    - Converts all known variants to canonical format
    - Preserves all other attributes unchanged

  3. Safety
    - Only updates records that need standardization
    - Preserves original data structure
    - Idempotent operation (safe to run multiple times)
*/

-- Function to standardize fund affiliation values
CREATE OR REPLACE FUNCTION standardize_fund_affiliation_value(input_value TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Return null for empty or null input
  IF input_value IS NULL OR trim(input_value) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Standardize buyout variants
  IF input_value IN (
    'buyout', 'Buyout', 'BUYOUT',
    'Fund:buyout', 'Fund: buyout', 'Fund: Buyout', 'Fund: Buyout Funds',
    'Fund:Buyout', 'Fund:Buyout Funds', 'buyout funds', 'Buyout Funds'
  ) THEN
    RETURN 'buyout';
  END IF;
  
  -- Standardize digital variants
  IF input_value IN (
    'digital', 'Digital', 'DIGITAL',
    'Fund:digital', 'Fund: digital', 'Fund: Digital', 'Fund: Digital Funds',
    'Fund:Digital', 'Fund:Digital Funds', 'digital funds', 'Digital Funds'
  ) THEN
    RETURN 'digital';
  END IF;
  
  -- Standardize impact variants
  IF input_value IN (
    'impact', 'Impact', 'IMPACT',
    'Fund:impact', 'Fund: impact', 'Fund: Impact', 'Fund: Impact Funds',
    'Fund:Impact', 'Fund:Impact Funds', 'impact funds', 'Impact Funds'
  ) THEN
    RETURN 'impact';
  END IF;
  
  -- Standardize other variants
  IF input_value IN (
    'other', 'Other', 'OTHER',
    'Fund:other', 'Fund: other', 'Fund: Other', 'Fund: Other Funds',
    'Fund:Other', 'Fund:Other Funds', 'other funds', 'Other Funds'
  ) THEN
    RETURN 'other';
  END IF;
  
  -- Default fallback for unknown values
  RETURN 'other';
END;
$$ LANGUAGE plpgsql;

-- Update attendees with standardized fund affiliation values
UPDATE attendees 
SET attributes = jsonb_set(
  attributes,
  '{fundAffiliation}',
  to_jsonb(standardize_fund_affiliation_value(attributes->>'fundAffiliation'))
)
WHERE attributes ? 'fundAffiliation' 
  AND attributes->>'fundAffiliation' IS NOT NULL
  AND trim(attributes->>'fundAffiliation') != ''
  AND standardize_fund_affiliation_value(attributes->>'fundAffiliation') != attributes->>'fundAffiliation';

-- Clean up the function after migration
DROP FUNCTION IF EXISTS standardize_fund_affiliation_value(TEXT);