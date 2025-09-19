/*
  # Add 'skipped' to import_status check constraint

  1. Schema Changes
    - Update raw_attendee_data_idloom_import_status_check constraint
    - Add 'skipped' as valid import_status value

  2. Purpose
    - Allow records to be marked as 'skipped' when ignored in review panel
    - Fixes database constraint violation error
*/

-- Drop the existing check constraint
ALTER TABLE raw_attendee_data_idloom 
DROP CONSTRAINT IF EXISTS raw_attendee_data_idloom_import_status_check;

-- Add the updated check constraint with 'skipped' included
ALTER TABLE raw_attendee_data_idloom 
ADD CONSTRAINT raw_attendee_data_idloom_import_status_check 
CHECK (import_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text, 'skipped'::text, 'approved'::text, 'rejected'::text]));