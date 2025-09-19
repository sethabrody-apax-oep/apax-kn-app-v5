/*
  # Update assignment type constraint to allow blocked seats

  1. Database Changes
    - Update the seat_assignments_assignment_type_check constraint to include 'blocked' as a valid assignment type
    - This allows blocked seats to be stored as seat assignments with assignment_type = 'blocked'

  2. Security
    - No changes to RLS policies needed
    - Existing policies already handle seat assignments appropriately
*/

-- Update the assignment_type constraint to include 'blocked'
ALTER TABLE seat_assignments 
DROP CONSTRAINT IF EXISTS seat_assignments_assignment_type_check;

ALTER TABLE seat_assignments 
ADD CONSTRAINT seat_assignments_assignment_type_check 
CHECK (assignment_type = ANY (ARRAY['manual'::text, 'auto'::text, 'self-selected'::text, 'blocked'::text]));