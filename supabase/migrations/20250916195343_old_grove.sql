/*
  # Fix assignment type constraint for blocked seats

  1. Database Changes
    - Update seat_assignments_assignment_type_check constraint to include 'blocked'
    - Ensure blocked seats can be saved properly

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop the existing constraint
ALTER TABLE seat_assignments DROP CONSTRAINT IF EXISTS seat_assignments_assignment_type_check;

-- Add the updated constraint that includes 'blocked'
ALTER TABLE seat_assignments ADD CONSTRAINT seat_assignments_assignment_type_check 
CHECK (assignment_type = ANY (ARRAY['manual'::text, 'auto'::text, 'self-selected'::text, 'blocked'::text]));