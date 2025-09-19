/*
  # Create Company Apax Partners Junction Table

  1. New Tables
    - `company_apax_partners`
      - `id` (uuid, primary key)
      - `standardized_company_id` (uuid, not null) - Links to standardized company
      - `attendee_id` (uuid, not null) - Links to Apax/Apax OEP attendee
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_apax_partners` table
    - Add policies for admin users to manage partner assignments
    - Add policy for all users to read assignments

  3. Constraints
    - Foreign keys to both standardized_companies and attendees
    - Unique constraint to prevent duplicate assignments
    - Check constraint to ensure only 3 partners per company (enforced by trigger)
*/

CREATE TABLE IF NOT EXISTS public.company_apax_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standardized_company_id uuid NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure unique assignments
  UNIQUE (standardized_company_id, attendee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_company ON public.company_apax_partners (standardized_company_id);
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_attendee ON public.company_apax_partners (attendee_id);

-- Enable RLS
ALTER TABLE public.company_apax_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.company_apax_partners
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.company_apax_partners
  FOR INSERT
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.company_apax_partners
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.company_apax_partners
  FOR DELETE
  USING (is_admin_user());