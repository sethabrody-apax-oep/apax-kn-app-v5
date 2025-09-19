/*
  # Create Company Aliases Table

  1. New Tables
    - `company_aliases`
      - `id` (uuid, primary key)
      - `alias` (text, unique) - Alternative company name
      - `standardized_company_id` (uuid, foreign key) - Reference to standardized company
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_aliases` table
    - Add policies for admin users to manage aliases
    - Add policy for all users to read alias data

  3. Indexes
    - Index on alias for fast lookups
    - Index on standardized_company_id for joins
*/

CREATE TABLE IF NOT EXISTS public.company_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  standardized_company_id UUID NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_aliases_alias ON public.company_aliases (alias);
CREATE INDEX IF NOT EXISTS idx_company_aliases_standardized_company ON public.company_aliases (standardized_company_id);

-- Enable Row Level Security
ALTER TABLE public.company_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.company_aliases
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.company_aliases
  FOR INSERT
  TO public
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.company_aliases
  FOR UPDATE
  TO public
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.company_aliases
  FOR DELETE
  TO public
  USING (is_admin_user());