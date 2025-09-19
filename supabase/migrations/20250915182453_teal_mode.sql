/*
  # Add Conference Seating and Business Development Requests to Companies

  1. New Columns
    - `seating_notes` (text) - Free text field for seating and business development requests
    - `priority_networking_attendees` (uuid[]) - Array of up to 5 attendee UUIDs for priority networking

  2. Security
    - Existing RLS policies will apply to new columns
    - Only admin and super_admin users can modify these fields

  3. Indexes
    - Add index on priority_networking_attendees for efficient seating queries
*/

-- Add new columns to standardized_companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standardized_companies' AND column_name = 'seating_notes'
  ) THEN
    ALTER TABLE standardized_companies ADD COLUMN seating_notes TEXT DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standardized_companies' AND column_name = 'priority_networking_attendees'
  ) THEN
    ALTER TABLE standardized_companies ADD COLUMN priority_networking_attendees UUID[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for efficient seating queries
CREATE INDEX IF NOT EXISTS idx_standardized_companies_priority_networking 
ON standardized_companies USING GIN (priority_networking_attendees);

-- Add constraint to limit priority networking attendees to maximum of 5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'standardized_companies' AND constraint_name = 'chk_max_priority_networking_attendees'
  ) THEN
    ALTER TABLE standardized_companies 
    ADD CONSTRAINT chk_max_priority_networking_attendees 
    CHECK (array_length(priority_networking_attendees, 1) IS NULL OR array_length(priority_networking_attendees, 1) <= 5);
  END IF;
END $$;