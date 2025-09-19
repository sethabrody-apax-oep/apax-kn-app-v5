/*
  # Company Statistics and Reporting Functions

  1. Attendee Statistics
    - `get_company_attendee_count()` - Count attendees per company
    - `get_company_attendee_breakdown()` - Detailed attendee statistics by type
    - `get_companies_by_attendee_count()` - Companies ranked by attendee count

  2. Apax Partner Statistics
    - `get_company_apax_partners()` - Get assigned Apax partners for a company
    - `get_apax_partner_assignments()` - All Apax partner assignments with details
    - `get_unassigned_companies()` - Companies without Apax partner assignments

  3. Company Analytics
    - `get_company_sector_distribution()` - Breakdown by sector
    - `get_company_geography_distribution()` - Breakdown by geography
*/

-- Function to get attendee count for a specific company
CREATE OR REPLACE FUNCTION get_company_attendee_count(company_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    attendee_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attendee_count
    FROM attendees
    WHERE company_name_standardized = company_name
    AND registration_status = 'confirmed';
    
    RETURN COALESCE(attendee_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed attendee breakdown for a company
CREATE OR REPLACE FUNCTION get_company_attendee_breakdown(company_name TEXT)
RETURNS TABLE(
    total_attendees BIGINT,
    ceo_count BIGINT,
    cfo_count BIGINT,
    c_level_count BIGINT,
    apax_ip_count BIGINT,
    apax_oep_count BIGINT,
    spouse_count BIGINT,
    speaker_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_attendees,
        COUNT(*) FILTER (WHERE (attributes->>'ceo')::boolean = true OR is_cfo = true) as ceo_count,
        COUNT(*) FILTER (WHERE is_cfo = true) as cfo_count,
        COUNT(*) FILTER (WHERE 
            (attributes->>'ceo')::boolean = true OR 
            is_cfo = true OR
            (attributes->>'coo')::boolean = true OR
            (attributes->>'chro')::boolean = true OR
            (attributes->>'otherCLevelExec')::boolean = true
        ) as c_level_count,
        COUNT(*) FILTER (WHERE (attributes->>'apaxIP')::boolean = true) as apax_ip_count,
        COUNT(*) FILTER (WHERE (attributes->>'apaxOEP')::boolean = true OR is_apax_ep = true) as apax_oep_count,
        COUNT(*) FILTER (WHERE is_spouse = true) as spouse_count,
        COUNT(*) FILTER (WHERE (attributes->>'speaker')::boolean = true) as speaker_count
    FROM attendees
    WHERE company_name_standardized = company_name
    AND registration_status = 'confirmed';
END;
$$ LANGUAGE plpgsql;

-- Function to get companies ranked by attendee count
CREATE OR REPLACE FUNCTION get_companies_by_attendee_count(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    sector TEXT,
    geography TEXT,
    subsector TEXT,
    attendee_count BIGINT,
    apax_partner_count BIGINT,
    is_parent BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.name,
        sc.sector,
        sc.geography,
        sc.subsector,
        COUNT(a.id) as attendee_count,
        COUNT(cap.id) as apax_partner_count,
        sc.is_parent_company
    FROM standardized_companies sc
    LEFT JOIN attendees a ON a.company_name_standardized = sc.name AND a.registration_status = 'confirmed'
    LEFT JOIN company_apax_partners cap ON cap.standardized_company_id = sc.id
    GROUP BY sc.id, sc.name, sc.sector, sc.geography, sc.subsector, sc.is_parent_company
    ORDER BY COUNT(a.id) DESC, sc.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get assigned Apax partners for a company
CREATE OR REPLACE FUNCTION get_company_apax_partners(company_id UUID)
RETURNS TABLE(
    partner_id UUID,
    partner_name TEXT,
    partner_email TEXT,
    partner_title TEXT,
    partner_type TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        CONCAT(a.first_name, ' ', a.last_name) as partner_name,
        a.email,
        a.title,
        CASE 
            WHEN (a.attributes->>'apaxIP')::boolean = true THEN 'Apax IP'
            WHEN (a.attributes->>'apaxOEP')::boolean = true OR a.is_apax_ep = true THEN 'Apax OEP'
            ELSE 'Other'
        END as partner_type,
        cap.created_at
    FROM company_apax_partners cap
    JOIN attendees a ON cap.attendee_id = a.id
    WHERE cap.standardized_company_id = company_id
    ORDER BY cap.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get all Apax partner assignments with company details
CREATE OR REPLACE FUNCTION get_apax_partner_assignments()
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    company_sector TEXT,
    partner_id UUID,
    partner_name TEXT,
    partner_type TEXT,
    attendee_count BIGINT,
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.name,
        sc.sector,
        a.id,
        CONCAT(a.first_name, ' ', a.last_name) as partner_name,
        CASE 
            WHEN (a.attributes->>'apaxIP')::boolean = true THEN 'Apax IP'
            WHEN (a.attributes->>'apaxOEP')::boolean = true OR a.is_apax_ep = true THEN 'Apax OEP'
            ELSE 'Other'
        END as partner_type,
        COUNT(att.id) as attendee_count,
        cap.created_at
    FROM company_apax_partners cap
    JOIN standardized_companies sc ON cap.standardized_company_id = sc.id
    JOIN attendees a ON cap.attendee_id = a.id
    LEFT JOIN attendees att ON att.company_name_standardized = sc.name AND att.registration_status = 'confirmed'
    GROUP BY sc.id, sc.name, sc.sector, a.id, a.first_name, a.last_name, a.attributes, a.is_apax_ep, cap.created_at
    ORDER BY sc.name, cap.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get companies without Apax partner assignments
CREATE OR REPLACE FUNCTION get_unassigned_companies(min_attendee_count INTEGER DEFAULT 1)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    sector TEXT,
    geography TEXT,
    attendee_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.name,
        sc.sector,
        sc.geography,
        COUNT(a.id) as attendee_count
    FROM standardized_companies sc
    LEFT JOIN attendees a ON a.company_name_standardized = sc.name AND a.registration_status = 'confirmed'
    LEFT JOIN company_apax_partners cap ON cap.standardized_company_id = sc.id
    WHERE cap.id IS NULL -- No Apax partners assigned
    GROUP BY sc.id, sc.name, sc.sector, sc.geography
    HAVING COUNT(a.id) >= min_attendee_count
    ORDER BY COUNT(a.id) DESC, sc.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get sector distribution
CREATE OR REPLACE FUNCTION get_company_sector_distribution()
RETURNS TABLE(
    sector TEXT,
    company_count BIGINT,
    attendee_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.sector,
        COUNT(DISTINCT sc.id) as company_count,
        COUNT(a.id) as attendee_count
    FROM standardized_companies sc
    LEFT JOIN attendees a ON a.company_name_standardized = sc.name AND a.registration_status = 'confirmed'
    GROUP BY sc.sector
    ORDER BY COUNT(a.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get geography distribution
CREATE OR REPLACE FUNCTION get_company_geography_distribution()
RETURNS TABLE(
    geography TEXT,
    company_count BIGINT,
    attendee_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.geography,
        COUNT(DISTINCT sc.id) as company_count,
        COUNT(a.id) as attendee_count
    FROM standardized_companies sc
    LEFT JOIN attendees a ON a.company_name_standardized = sc.name AND a.registration_status = 'confirmed'
    GROUP BY sc.geography
    ORDER BY COUNT(a.id) DESC;
END;
$$ LANGUAGE plpgsql;