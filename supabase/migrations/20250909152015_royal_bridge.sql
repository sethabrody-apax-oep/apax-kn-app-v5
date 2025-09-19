/*
  # Create Company Aliases Table

  1. New Tables
    - `company_aliases`
      - `id` (uuid, primary key)
      - `alias` (text, unique, not null) - Alternative company name
      - `standardized_company_id` (uuid, not null) - Links to standardized company
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_aliases` table
    - Add policies for admin users to manage aliases
    - Add policy for all users to read aliases

  3. Constraints
    - Foreign key to standardized_companies with cascade delete
    - Unique constraint on alias names
*/

CREATE TABLE IF NOT EXISTS public.company_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL UNIQUE,
  standardized_company_id uuid NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_aliases_standardized_company ON public.company_aliases (standardized_company_id);
CREATE INDEX IF NOT EXISTS idx_company_aliases_alias ON public.company_aliases (alias);

-- Enable RLS
ALTER TABLE public.company_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.company_aliases
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.company_aliases
  FOR INSERT
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.company_aliases
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.company_aliases
  FOR DELETE
  USING (is_admin_user());