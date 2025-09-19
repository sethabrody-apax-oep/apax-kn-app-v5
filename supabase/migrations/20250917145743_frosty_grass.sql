/*
  # Add fund_analytics_category to standardized_companies

  1. Schema Changes
    - Add `fund_analytics_category` column to `standardized_companies` table
    - Set default value to 'Other Funds' for existing records
    - Add check constraint to ensure valid category values

  2. Data Migration
    - All existing companies will default to 'Other Funds'
    - Companies can be manually categorized using the Company Management interface

  3. Benefits
    - Eliminates complex inference logic from attendee attributes
    - Provides single source of truth for company categorization
    - Simplifies analytics calculations and reduces counting errors
*/

-- Add the fund_analytics_category column to standardized_companies
ALTER TABLE standardized_companies 
ADD COLUMN fund_analytics_category TEXT DEFAULT 'Other Funds';

-- Add check constraint to ensure valid category values
ALTER TABLE standardized_companies 
ADD CONSTRAINT standardized_companies_fund_analytics_category_check 
CHECK (fund_analytics_category IN (
  'Apax Attendees',
  'Buyout Funds', 
  'Digital Funds',
  'Impact Funds',
  'Other Funds',
  'Sponsors & Vendors'
));

-- Create index for better query performance
CREATE INDEX idx_standardized_companies_fund_analytics_category 
ON standardized_companies(fund_analytics_category);

-- Update some known companies based on existing logic
UPDATE standardized_companies 
SET fund_analytics_category = 'Apax Attendees' 
WHERE sector IN ('Apax', 'Apax OEP') OR name ILIKE '%apax%';

UPDATE standardized_companies 
SET fund_analytics_category = 'Sponsors & Vendors' 
WHERE sector = 'Vendors/Sponsors';

-- Set specific companies to Buyout Funds based on previous logic
UPDATE standardized_companies 
SET fund_analytics_category = 'Buyout Funds' 
WHERE LOWER(name) IN (
  'bonterra',
  'oncourse home solutions', 
  'finastra',
  'ecoonline',
  'eci software solutions',
  'zellis'
);

-- Set specific companies to Digital Funds based on previous logic  
UPDATE standardized_companies 
SET fund_analytics_category = 'Digital Funds' 
WHERE LOWER(name) IN (
  'clearbank',
  'magaya software',
  'dlrdmv',
  'pricefx',
  'metametrics'
);