/*
  # Add CTO/CIO Attribute Support

  1. Database Changes
    - Update attendees table attributes JSONB to support cto_cio field
    - No schema changes needed as attributes is already JSONB

  2. Notes
    - The cto_cio attribute will be stored in the attributes JSONB column
    - Frontend code has been updated to handle this attribute
    - This migration serves as documentation of the change
*/

-- No actual database schema changes needed since attributes is already a JSONB column
-- The cto_cio field will be stored as part of the attributes object

-- Verify the attributes column exists and is JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendees' 
    AND column_name = 'attributes' 
    AND data_type = 'jsonb'
  ) THEN
    RAISE EXCEPTION 'attendees.attributes column is missing or not JSONB type';
  END IF;
END $$;