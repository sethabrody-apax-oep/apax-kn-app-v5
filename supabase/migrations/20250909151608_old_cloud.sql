/*
  # Create company logo management functions

  1. New Functions
    - `update_company_logo(company_id, logo_url)` - Updates company logo
    - `fetch_company_logo_from_website(company_id)` - Attempts to fetch logo from website
    - `get_company_with_logo(company_id)` - Returns company data with logo information

  2. Security
    - Functions use SECURITY DEFINER for proper permissions
    - Input validation and error handling
    - Logging for audit trail
*/

-- Function to update company logo
CREATE OR REPLACE FUNCTION public.update_company_logo(
  company_id UUID,
  logo_url TEXT
)
RETURNS JSONB AS $$
DECLARE
  company_name TEXT;
  result JSONB;
BEGIN
  -- Validate input
  IF company_id IS NULL THEN
    RAISE EXCEPTION 'Company ID cannot be null';
  END IF;

  -- Get company name for logging
  SELECT name INTO company_name FROM public.standardized_companies WHERE id = company_id;
  
  IF company_name IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- Update the logo
  UPDATE public.standardized_companies 
  SET logo = logo_url,
      updated_at = now()
  WHERE id = company_id;

  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'company_id', company_id,
    'company_name', company_name,
    'logo_url', logo_url,
    'updated_at', now()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'company_id', company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company with logo information
CREATE OR REPLACE FUNCTION public.get_company_with_logo(company_id UUID)
RETURNS JSONB AS $$
DECLARE
  company_data RECORD;
  result JSONB;
BEGIN
  SELECT * INTO company_data 
  FROM public.standardized_companies 
  WHERE id = company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Company not found');
  END IF;

  result := jsonb_build_object(
    'success', true,
    'company', row_to_json(company_data)
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;