/*
  # Create Company Management Functions

  1. Functions Created
    - `merge_companies(source_company_id, target_company_id)` - Merges two companies
    - `update_company_logo(company_id, logo_url)` - Updates company logo
    - `get_company_hierarchy(company_id)` - Gets parent/child relationships
    - `check_apax_partner_limit()` - Enforces 3-partner limit per company

  2. Triggers Created
    - `trigger_check_apax_partner_limit` - Validates partner assignments

  3. Business Logic
    - Company merging moves all data to target company
    - Logo management with validation
    - Partner limit enforcement
    - Hierarchy management for parent/child companies
*/

-- Function to merge two companies
CREATE OR REPLACE FUNCTION public.merge_companies(
  source_company_id UUID,
  target_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  source_company RECORD;
  target_company RECORD;
BEGIN
  -- Get source and target company details
  SELECT * INTO source_company FROM public.standardized_companies WHERE id = source_company_id;
  SELECT * INTO target_company FROM public.standardized_companies WHERE id = target_company_id;
  
  IF source_company IS NULL OR target_company IS NULL THEN
    RAISE EXCEPTION 'Source or target company not found';
  END IF;
  
  -- Move all attendees from source to target company
  UPDATE public.attendees 
  SET company_name_standardized = target_company.name
  WHERE company_name_standardized = source_company.name;
  
  -- Move all Apax partner assignments
  UPDATE public.company_apax_partners 
  SET standardized_company_id = target_company_id
  WHERE standardized_company_id = source_company_id;
  
  -- Create alias for the source company name
  INSERT INTO public.company_aliases (alias, standardized_company_id)
  VALUES (source_company.name, target_company_id)
  ON CONFLICT (alias) DO NOTHING;
  
  -- Move any existing aliases from source to target
  UPDATE public.company_aliases 
  SET standardized_company_id = target_company_id
  WHERE standardized_company_id = source_company_id;
  
  -- Delete the source company
  DELETE FROM public.standardized_companies WHERE id = source_company_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error merging companies: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update company logo
CREATE OR REPLACE FUNCTION public.update_company_logo(
  company_id UUID,
  logo_url TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.standardized_companies 
  SET 
    logo = logo_url,
    updated_at = now()
  WHERE id = company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating company logo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company hierarchy
CREATE OR REPLACE FUNCTION public.get_company_hierarchy(company_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  level INTEGER,
  is_parent BOOLEAN
) AS $$
BEGIN
  -- Return the company and its children
  RETURN QUERY
  WITH RECURSIVE company_tree AS (
    -- Base case: the requested company
    SELECT 
      c.id,
      c.name,
      0 as level,
      c.is_parent_company as is_parent
    FROM public.standardized_companies c
    WHERE c.id = company_id
    
    UNION ALL
    
    -- Recursive case: children of companies in the tree
    SELECT 
      c.id,
      c.name,
      ct.level + 1,
      c.is_parent_company
    FROM public.standardized_companies c
    INNER JOIN company_tree ct ON c.parent_company_id = ct.id
  )
  SELECT * FROM company_tree ORDER BY level, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check Apax partner limit (max 3 per company)
CREATE OR REPLACE FUNCTION public.check_apax_partner_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Count existing partners for this company
  SELECT COUNT(*) INTO current_count
  FROM public.company_apax_partners
  WHERE standardized_company_id = NEW.standardized_company_id;
  
  -- Check if adding this partner would exceed the limit
  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Cannot assign more than 3 Apax partners to a single company';
  END IF;
  
  -- Verify the attendee is actually Apax or Apax OEP
  IF NOT EXISTS (
    SELECT 1 FROM public.attendees 
    WHERE id = NEW.attendee_id 
    AND (
      (attributes->>'apaxIP')::boolean = true OR
      (attributes->>'apaxOEP')::boolean = true OR
      is_apax_ep = true
    )
  ) THEN
    RAISE EXCEPTION 'Only Apax IP or Apax OEP attendees can be assigned as company partners';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Apax partner limit
CREATE TRIGGER trigger_check_apax_partner_limit
  BEFORE INSERT ON public.company_apax_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.check_apax_partner_limit();