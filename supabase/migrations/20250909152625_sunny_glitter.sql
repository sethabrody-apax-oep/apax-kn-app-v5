/*
  # Create Company Standardization Functions

  1. Functions Created
    - `standardize_company_name(input_name)` - Finds or creates standardized company
    - `find_company_by_alias(alias_name)` - Looks up company by alias
    - `add_company_alias(company_id, alias_name)` - Adds new alias to company
    - `get_company_attendees(company_id)` - Gets all attendees for a company

  2. Business Logic
    - Automatic company name standardization
    - Alias-based company lookup
    - Company attendee management
    - Data consistency validation
*/

-- Function to standardize company name (find existing or suggest creation)
CREATE OR REPLACE FUNCTION public.standardize_company_name(input_name TEXT)
RETURNS TABLE(
  company_id UUID,
  standardized_name TEXT,
  found_via TEXT,
  needs_creation BOOLEAN
) AS $$
DECLARE
  found_company RECORD;
  cleaned_input TEXT;
BEGIN
  -- Clean the input name
  cleaned_input := TRIM(input_name);
  
  -- First, try exact match on standardized companies
  SELECT sc.id, sc.name INTO found_company
  FROM public.standardized_companies sc
  WHERE LOWER(sc.name) = LOWER(cleaned_input);
  
  IF found_company IS NOT NULL THEN
    RETURN QUERY SELECT found_company.id, found_company.name, 'exact_match'::TEXT, false;
    RETURN;
  END IF;
  
  -- Second, try alias lookup
  SELECT sc.id, sc.name INTO found_company
  FROM public.standardized_companies sc
  INNER JOIN public.company_aliases ca ON sc.id = ca.standardized_company_id
  WHERE LOWER(ca.alias) = LOWER(cleaned_input);
  
  IF found_company IS NOT NULL THEN
    RETURN QUERY SELECT found_company.id, found_company.name, 'alias_match'::TEXT, false;
    RETURN;
  END IF;
  
  -- Third, try fuzzy matching (similar names)
  SELECT sc.id, sc.name INTO found_company
  FROM public.standardized_companies sc
  WHERE similarity(LOWER(sc.name), LOWER(cleaned_input)) > 0.7
  ORDER BY similarity(LOWER(sc.name), LOWER(cleaned_input)) DESC
  LIMIT 1;
  
  IF found_company IS NOT NULL THEN
    RETURN QUERY SELECT found_company.id, found_company.name, 'fuzzy_match'::TEXT, false;
    RETURN;
  END IF;
  
  -- No match found, needs creation
  RETURN QUERY SELECT NULL::UUID, cleaned_input, 'no_match'::TEXT, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find company by alias
CREATE OR REPLACE FUNCTION public.find_company_by_alias(alias_name TEXT)
RETURNS TABLE(
  company_id UUID,
  company_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.id, sc.name
  FROM public.standardized_companies sc
  INNER JOIN public.company_aliases ca ON sc.id = ca.standardized_company_id
  WHERE LOWER(ca.alias) = LOWER(TRIM(alias_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add company alias
CREATE OR REPLACE FUNCTION public.add_company_alias(
  company_id UUID,
  alias_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.company_aliases (alias, standardized_company_id)
  VALUES (TRIM(alias_name), company_id)
  ON CONFLICT (alias) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding company alias: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all attendees for a company
CREATE OR REPLACE FUNCTION public.get_company_attendees(company_id UUID)
RETURNS TABLE(
  attendee_id UUID,
  attendee_name TEXT,
  attendee_title TEXT,
  attendee_email TEXT,
  is_apax_partner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    CONCAT(a.first_name, ' ', a.last_name),
    a.title,
    a.email,
    EXISTS(
      SELECT 1 FROM public.company_apax_partners cap 
      WHERE cap.attendee_id = a.id AND cap.standardized_company_id = company_id
    ) as is_apax_partner
  FROM public.attendees a
  INNER JOIN public.standardized_companies sc ON a.company_name_standardized = sc.name
  WHERE sc.id = company_id
  ORDER BY a.last_name, a.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;