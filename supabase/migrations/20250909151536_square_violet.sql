/*
  # Create company aliases table

  1. New Tables
    - `company_aliases`
      - `id` (uuid, primary key)
      - `alias` (text, unique) - Alternative company name/variant
      - `standardized_company_id` (uuid, foreign key) - Links to standardized company
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_aliases` table
    - Add policies for admin users to manage aliases
    - Add policy for all users to read alias data

  3. Constraints
    - Unique alias names to prevent conflicts
    - Foreign key cascade delete when standardized company is removed
*/

CREATE TABLE IF NOT EXISTS public.company_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  standardized_company_id UUID NOT NULL REFERENCES public.standardized_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" 
  ON public.company_aliases 
  FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users with admin role" 
  ON public.company_aliases 
  FOR INSERT 
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for authenticated users with admin role" 
  ON public.company_aliases 
  FOR UPDATE 
  USING (is_admin_user());

CREATE POLICY "Enable delete for authenticated users with admin role" 
  ON public.company_aliases 
  FOR DELETE 
  USING (is_admin_user());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_aliases_alias ON public.company_aliases (alias);
CREATE INDEX IF NOT EXISTS idx_company_aliases_standardized_company ON public.company_aliases (standardized_company_id);