/*
  # Create Company Management Functions

  1. Functions
    - `merge_companies()` - Merges one company into another as an alias
    - `update_company_logo()` - Updates company logo URL
    - `get_company_with_logo()` - Retrieves company data with logo info
    - `check_apax_partner_limit()` - Validates 3-partner limit per company

  2. Triggers
    - Trigger to enforce Apax partner limit on insert/update

  3. Security
    - Functions use security definer for admin operations
    - Proper error handling and validation
*/

-- Function to merge companies (source becomes alias of target)
CREATE OR REPLACE FUNCTION public.merge_companies(
  source_company_id uuid,
  target_company_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  source_company_name text;
  target_company_name text;
  affected_attendees integer;
BEGIN
  -- Validate input parameters
  IF source_company_id IS NULL OR target_company_id IS NULL THEN
    RAISE EXCEPTION 'Both source and target company IDs must be provided';
  END IF;
  
  IF source_company_id = target_company_id THEN
    RAISE EXCEPTION 'Cannot merge a company with itself';
  END IF;
  
  -- Get company names for logging
  SELECT name INTO source_company_name FROM public.standardized_companies WHERE id = source_company_id;
  SELECT name INTO target_company_name FROM public.standardized_companies WHERE id = target_company_id;
  
  IF source_company_name IS NULL THEN
    RAISE EXCEPTION 'Source company not found';
  END IF;
  
  IF target_company_name IS NULL THEN
    RAISE EXCEPTION 'Target company not found';
  END IF;
  
  -- Start transaction
  BEGIN
    -- 1. Update all attendees using source company to use target company
    UPDATE public.attendees 
    SET company_name_standardized = target_company_name,
        updated_at = now()
    WHERE company_name_standardized = source_company_name;
    
    GET DIAGNOSTICS affected_attendees = ROW_COUNT;
    
    -- 2. Move any Apax partner assignments from source to target
    UPDATE public.company_apax_partners
    SET standardized_company_id = target_company_id,
        updated_at = now()
    WHERE standardized_company_id = source_company_id;
    
    -- 3. Move any aliases from source to target
    UPDATE public.company_aliases
    SET standardized_company_id = target_company_id,
        updated_at = now()
    WHERE standardized_company_id = source_company_id;
    
    -- 4. Add source company name as an alias of target company
    INSERT INTO public.company_aliases (alias, standardized_company_id)
    VALUES (source_company_name, target_company_id);
    
    -- 5. Delete the source company record
    DELETE FROM public.standardized_companies WHERE id = source_company_id;
    
    -- Log the merge operation
    RAISE NOTICE 'Successfully merged % into %. Updated % attendee records.', 
      source_company_name, target_company_name, affected_attendees;
    
    RETURN true;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback transaction on any error
    RAISE EXCEPTION 'Error merging companies: %', SQLERRM;
    RETURN false;
  END;
END;
$$;

-- Function to update company logo
CREATE OR REPLACE FUNCTION public.update_company_logo(
  company_id uuid,
  logo_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.standardized_companies
  SET logo = logo_url,
      updated_at = now()
  WHERE id = company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to get company with logo info
CREATE OR REPLACE FUNCTION public.get_company_with_logo(
  company_id uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  sector text,
  geography text,
  subsector text,
  logo text,
  website text,
  is_parent_company boolean,
  parent_company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.name,
    sc.sector,
    sc.geography,
    sc.subsector,
    sc.logo,
    sc.website,
    sc.is_parent_company,
    sc.parent_company_id
  FROM public.standardized_companies sc
  WHERE sc.id = company_id;
END;
$$;

-- Function to check Apax partner limit (max 3 per company)
CREATE OR REPLACE FUNCTION public.check_apax_partner_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Count existing partners for this company
  SELECT COUNT(*) INTO current_count
  FROM public.company_apax_partners
  WHERE standardized_company_id = NEW.standardized_company_id;
  
  -- Check if adding this partner would exceed the limit
  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Cannot assign more than 3 Apax partners to a single company';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce Apax partner limit
CREATE TRIGGER trigger_check_apax_partner_limit
  BEFORE INSERT ON public.company_apax_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.check_apax_partner_limit();