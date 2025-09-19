/*
  # Create Company Apax Partners Table

  1. New Tables
    - `company_apax_partners`
      - `id` (uuid, primary key)
      - `standardized_company_id` (uuid, foreign key) - Reference to company
      - `attendee_id` (uuid, foreign key) - Reference to Apax/Apax OEP attendee
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_apax_partners` table
    - Add policies for admin users to manage partner assignments
    - Add policy for all users to read partner data

  3. Constraints
    - Unique constraint on (standardized_company_id, attendee_id)
    - Maximum 3 partners per company (enforced by trigger in Phase 2)

  4. Indexes
    - Index on company for fast company lookups
    - Index on attendee for fast attendee lookups
*/

CREATE TABLE IF NOT EXISTS public.company_apax_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standardized_company_id UUID NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure unique assignments
  UNIQUE (standardized_company_id, attendee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_company 
  ON public.company_apax_partners (standardized_company_id);
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_attendee 
  ON public.company_apax_partners (attendee_id);

-- Enable Row Level Security
ALTER TABLE public.company_apax_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.company_apax_partners
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.company_apax_partners
  FOR INSERT
  TO public
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.company_apax_partners
  FOR UPDATE
  TO public
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.company_apax_partners
  FOR DELETE
  TO public
  USING (is_admin_user());