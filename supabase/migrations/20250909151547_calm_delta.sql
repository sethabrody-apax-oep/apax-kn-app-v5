/*
  # Create company Apax partners junction table

  1. New Tables
    - `company_apax_partners`
      - `id` (uuid, primary key)
      - `standardized_company_id` (uuid, foreign key) - Links to standardized company
      - `attendee_id` (uuid, foreign key) - Links to Apax/Apax OEP attendee
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_apax_partners` table
    - Add policies for admin users to manage partner assignments
    - Add policy for all users to read partner assignments

  3. Constraints
    - Unique combination of company and attendee (prevents duplicate assignments)
    - Foreign key cascades for data integrity
    - Will be enforced by trigger to limit 3 partners per company
*/

CREATE TABLE IF NOT EXISTS public.company_apax_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standardized_company_id UUID NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (standardized_company_id, attendee_id) -- Ensures unique assignment
);

-- Enable RLS
ALTER TABLE public.company_apax_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" 
  ON public.company_apax_partners 
  FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users with admin role" 
  ON public.company_apax_partners 
  FOR INSERT 
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for authenticated users with admin role" 
  ON public.company_apax_partners 
  FOR UPDATE 
  USING (is_admin_user());

CREATE POLICY "Enable delete for authenticated users with admin role" 
  ON public.company_apax_partners 
  FOR DELETE 
  USING (is_admin_user());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_company ON public.company_apax_partners (standardized_company_id);
CREATE INDEX IF NOT EXISTS idx_company_apax_partners_attendee ON public.company_apax_partners (attendee_id);