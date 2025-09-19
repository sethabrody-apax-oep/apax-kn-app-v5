/*
  # Create Standardized Companies Table

  1. New Tables
    - `standardized_companies`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Standardized company name
      - `sector` (text, not null) - Business sector classification
      - `geography` (text, not null) - Geographic region
      - `subsector` (text, not null) - Detailed subsector classification
      - `logo` (text) - URL to company logo
      - `website` (text) - Company website for logo fetching
      - `is_parent_company` (boolean) - Indicates if this is a parent company
      - `parent_company_id` (uuid) - Links to parent company if applicable
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `standardized_companies` table
    - Add policies for admin users to manage companies
    - Add policy for all users to read companies

  3. Constraints
    - Sector must be one of predefined values
    - Geography must be one of predefined values  
    - Subsector must be one of predefined values
    - Parent company reference with cascade handling
*/

CREATE TABLE IF NOT EXISTS public.standardized_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sector text NOT NULL,
  geography text NOT NULL,
  subsector text NOT NULL,
  logo text,
  website text,
  is_parent_company boolean DEFAULT false,
  parent_company_id uuid REFERENCES public.standardized_companies(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT chk_sector CHECK (sector IN (
    'Apax Digital', 'Services', 'Internet & Consumer', 'Tech', 
    'Healthcare', 'Apax', 'Apax OEP', 'Impact', 'Other'
  )),
  
  CONSTRAINT chk_geography CHECK (geography IN (
    'US', 'EU', 'ROW', 'Global'
  )),
  
  CONSTRAINT chk_subsector CHECK (subsector IN (
    'Consumer Goods & Services', 'Density Driven Businesses', 
    'Healthcare Adjacencies', 'Healthcare Services', 'Legacy Media', 
    'Medtech', 'Online Marketplaces', 'Outsourced Sales and Marketing', 
    'Pharma', 'Professional Services', 'Residential Services', 
    'Software', 'Tech-Enabled Services', 'Telecom'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_standardized_companies_sector ON public.standardized_companies (sector);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_geography ON public.standardized_companies (geography);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_subsector ON public.standardized_companies (subsector);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_parent ON public.standardized_companies (parent_company_id);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_is_parent ON public.standardized_companies (is_parent_company);

-- Enable RLS
ALTER TABLE public.standardized_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.standardized_companies
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.standardized_companies
  FOR INSERT
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for admin users"
  ON public.standardized_companies
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable delete for admin users"
  ON public.standardized_companies
  FOR DELETE
  USING (is_admin_user());