/*
  # Create standardized companies table

  1. New Tables
    - `standardized_companies`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Standardized company name
      - `sector` (text, required) - Business sector classification
      - `geography` (text, required) - Geographic region
      - `subsector` (text, required) - Detailed subsector classification
      - `logo` (text, optional) - URL to company logo
      - `website` (text, optional) - Company website for logo fetching
      - `is_parent_company` (boolean) - Indicates if this is a parent company
      - `parent_company_id` (uuid, optional) - Links to parent company
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `standardized_companies` table
    - Add policies for admin users to manage companies
    - Add policy for all users to read company data

  3. Constraints
    - Sector values limited to predefined list
    - Geography values limited to predefined regions
    - Subsector values limited to predefined categories
    - Parent company self-reference with cascade handling
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
  CONSTRAINT chk_sector CHECK (sector IN ('Apax Digital', 'Services', 'Internet & Consumer', 'Tech', 'Healthcare', 'Apax', 'Apax OEP', 'Impact', 'Other')),
  CONSTRAINT chk_geography CHECK (geography IN ('US', 'EU', 'ROW', 'Global')),
  CONSTRAINT chk_subsector CHECK (subsector IN ('Consumer Goods & Services', 'Density Driven Businesses', 'Healthcare Adjacencies', 'Healthcare Services', 'Legacy Media', 'Medtech', 'Online Marketplaces', 'Outsourced Sales and Marketing', 'Pharma', 'Professional Services', 'Residential Services', 'Software', 'Tech-Enabled Services', 'Telecom'))
);

-- Enable RLS
ALTER TABLE public.standardized_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" 
  ON public.standardized_companies 
  FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users with admin role" 
  ON public.standardized_companies 
  FOR INSERT 
  WITH CHECK (is_admin_user());

CREATE POLICY "Enable update for authenticated users with admin role" 
  ON public.standardized_companies 
  FOR UPDATE 
  USING (is_admin_user());

CREATE POLICY "Enable delete for authenticated users with admin role" 
  ON public.standardized_companies 
  FOR DELETE 
  USING (is_admin_user());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_standardized_companies_name ON public.standardized_companies (name);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_sector ON public.standardized_companies (sector);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_parent ON public.standardized_companies (parent_company_id);
CREATE INDEX IF NOT EXISTS idx_standardized_companies_is_parent ON public.standardized_companies (is_parent_company);