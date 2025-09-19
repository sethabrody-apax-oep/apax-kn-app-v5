/*
  # Create Standardized Companies Table

  1. New Tables
    - `standardized_companies`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Standardized company name
      - `sector` (text, required) - Business sector classification
      - `geography` (text, required) - Geographic region
      - `subsector` (text, required) - Detailed sector classification
      - `logo` (text, optional) - Company logo URL
      - `website` (text, optional) - Company website for logo fetching
      - `is_parent_company` (boolean) - Indicates parent company status
      - `parent_company_id` (uuid, optional) - Reference to parent company
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `standardized_companies` table
    - Add policies for admin users to manage companies
    - Add policy for all users to read company data

  3. Constraints
    - Sector values limited to predefined list
    - Geography values limited to US, EU, ROW, Global
    - Subsector values limited to predefined business categories
    - Parent company references must be valid
*/

CREATE TABLE IF NOT EXISTS public.standardized_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL,
  geography TEXT NOT NULL,
  subsector TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  is_parent_company BOOLEAN DEFAULT false,
  parent_company_id UUID REFERENCES public.standardized_companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Sector constraint
  CONSTRAINT chk_sector CHECK (sector = ANY (ARRAY[
    'Apax Digital'::text,
    'Services'::text,
    'Internet & Consumer'::text,
    'Tech'::text,
    'Healthcare'::text,
    'Apax'::text,
    'Apax OEP'::text,
    'Impact'::text,
    'Other'::text
  ])),
  
  -- Geography constraint
  CONSTRAINT chk_geography CHECK (geography = ANY (ARRAY[
    'US'::text,
    'EU'::text,
    'ROW'::text,
    'Global'::text
  ])),
  
  -- Subsector constraint
  CONSTRAINT chk_subsector CHECK (subsector = ANY (ARRAY[
    'Consumer Goods & Services'::text,
    'Density Driven Businesses'::text,
    'Healthcare Adjacencies'::text,
    'Healthcare Services'::text,
    'Legacy Media'::text,
    'Medtech'::text,
    'Online Marketplaces'::text,
    'Outsourced Sales and Marketing'::text,
    'Pharma'::text,
    'Professional Services'::text,
    'Residential Services'::text,
    'Software'::text,
    'Tech-Enabled Services'::text,
    'Telecom'::text
  ]))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_standardized_companies_sector ON public.standardized_companies (sector);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_geography ON public.standardized_companies (geography);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_subsector ON public.standardized_companies (subsector);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_parent ON public.standardized_companies (parent_company_id);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_is_parent ON public.standardized_companies (is_parent_company);

-- Enable Row Level Security
ALTER TABLE public.standardized_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.standardized_companies
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.standardized_companies
  FOR INSERT
  TO public
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.standardized_companies
  FOR UPDATE
  TO public
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.standardized_companies
  FOR DELETE
  TO public
  USING (is_admin_user());