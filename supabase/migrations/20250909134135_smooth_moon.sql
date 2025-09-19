/*
  # Phase 3: Backend Automation for Spouse Record Management

  1. Database Functions
    - `sync_spouse_attendee_record()` - Handles spouse record creation, updates, and deletion
    - Comprehensive error handling and logging
    - Validates input data before processing

  2. Database Triggers
    - `after_attendee_update_sync_spouse` - Fires on INSERT/UPDATE of attendees
    - Automatically manages spouse records when `has_spouse` or `spouse_details` changes

  3. Security
    - Functions run with elevated privileges to bypass RLS
    - Proper validation to prevent data corruption
    - Logging for audit trail
*/

-- Function to sync spouse attendee records
CREATE OR REPLACE FUNCTION sync_spouse_attendee_record()
RETURNS TRIGGER AS $$
DECLARE
    spouse_record_id UUID;
    spouse_access_code TEXT;
    spouse_email TEXT;
BEGIN
    -- Only process if this is not already a spouse record
    IF NEW.is_spouse = TRUE THEN
        RETURN NEW;
    END IF;

    -- Case 1: Attendee now has spouse (has_spouse changed to true or spouse_details updated)
    IF NEW.has_spouse = TRUE AND NEW.spouse_details IS NOT NULL AND NEW.spouse_details != '{}' THEN
        
        -- Validate spouse details have required fields
        IF NOT (NEW.spouse_details ? 'firstName' AND NEW.spouse_details ? 'lastName') THEN
            RAISE WARNING 'Spouse details missing required firstName or lastName for attendee %', NEW.id;
            RETURN NEW;
        END IF;

        -- Check if spouse record already exists
        SELECT id INTO spouse_record_id
        FROM attendees 
        WHERE primary_attendee_id = NEW.id AND is_spouse = TRUE
        LIMIT 1;

        -- Generate spouse email if not provided
        spouse_email := COALESCE(
            NEW.spouse_details->>'email',
            'spouse.' || NEW.id || '@conference.temp'
        );

        -- Generate unique access code
        spouse_access_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

        IF spouse_record_id IS NULL THEN
            -- Create new spouse record
            INSERT INTO attendees (
                salutation,
                first_name,
                last_name,
                email,
                title,
                company,
                bio,
                photo,
                business_phone,
                mobile_phone,
                check_in_date,
                check_out_date,
                hotel_selection,
                custom_hotel,
                registration_id,
                has_spouse,
                spouse_details,
                dining_selections,
                selected_breakouts,
                registration_status,
                access_code,
                attributes,
                dietary_requirements,
                address1,
                address2,
                postal_code,
                city,
                state,
                country,
                country_code,
                room_type,
                assistant_name,
                assistant_email,
                idloom_id,
                is_cfo,
                is_apax_ep,
                is_spouse,
                primary_attendee_id
            ) VALUES (
                COALESCE(NEW.spouse_details->>'salutation', ''),
                NEW.spouse_details->>'firstName',
                NEW.spouse_details->>'lastName',
                spouse_email,
                COALESCE(NEW.spouse_details->>'title', 'Spouse of ' || NEW.first_name || ' ' || NEW.last_name),
                COALESCE(NEW.spouse_details->>'company', NEW.company),
                COALESCE(NEW.spouse_details->>'bio', ''),
                COALESCE(NEW.spouse_details->>'photo', 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400'),
                COALESCE(NEW.spouse_details->>'businessPhone', ''),
                COALESCE(NEW.spouse_details->>'mobilePhone', ''),
                NEW.check_in_date,
                NEW.check_out_date,
                NEW.hotel_selection,
                NEW.custom_hotel,
                CASE WHEN NEW.registration_id IS NOT NULL THEN NEW.registration_id || '-spouse' ELSE NULL END,
                FALSE,
                '{}',
                NEW.dining_selections,
                NEW.selected_breakouts,
                NEW.registration_status,
                spouse_access_code,
                NEW.attributes,
                COALESCE(NEW.spouse_details->>'dietaryRequirements', NEW.dietary_requirements, ''),
                NEW.address1,
                NEW.address2,
                NEW.postal_code,
                NEW.city,
                NEW.state,
                NEW.country,
                NEW.country_code,
                NEW.room_type,
                NEW.assistant_name,
                NEW.assistant_email,
                CASE WHEN NEW.idloom_id IS NOT NULL THEN NEW.idloom_id || '-spouse' ELSE NULL END,
                FALSE,
                NEW.is_apax_ep,
                TRUE,
                NEW.id
            );
            
            RAISE NOTICE 'Created spouse record for attendee % (% %)', NEW.id, NEW.spouse_details->>'firstName', NEW.spouse_details->>'lastName';
        ELSE
            -- Update existing spouse record
            UPDATE attendees SET
                salutation = COALESCE(NEW.spouse_details->>'salutation', ''),
                first_name = NEW.spouse_details->>'firstName',
                last_name = NEW.spouse_details->>'lastName',
                email = spouse_email,
                title = COALESCE(NEW.spouse_details->>'title', 'Spouse of ' || NEW.first_name || ' ' || NEW.last_name),
                company = COALESCE(NEW.spouse_details->>'company', NEW.company),
                bio = COALESCE(NEW.spouse_details->>'bio', ''),
                photo = COALESCE(NEW.spouse_details->>'photo', 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400'),
                business_phone = COALESCE(NEW.spouse_details->>'businessPhone', ''),
                mobile_phone = COALESCE(NEW.spouse_details->>'mobilePhone', ''),
                check_in_date = NEW.check_in_date,
                check_out_date = NEW.check_out_date,
                hotel_selection = NEW.hotel_selection,
                custom_hotel = NEW.custom_hotel,
                dining_selections = NEW.dining_selections,
                selected_breakouts = NEW.selected_breakouts,
                registration_status = NEW.registration_status,
                attributes = NEW.attributes,
                dietary_requirements = COALESCE(NEW.spouse_details->>'dietaryRequirements', NEW.dietary_requirements, ''),
                address1 = NEW.address1,
                address2 = NEW.address2,
                postal_code = NEW.postal_code,
                city = NEW.city,
                state = NEW.state,
                country = NEW.country,
                country_code = NEW.country_code,
                room_type = NEW.room_type,
                assistant_name = NEW.assistant_name,
                assistant_email = NEW.assistant_email,
                updated_at = NOW()
            WHERE id = spouse_record_id;
            
            RAISE NOTICE 'Updated spouse record % for attendee %', spouse_record_id, NEW.id;
        END IF;

    -- Case 2: Attendee no longer has spouse (has_spouse changed to false)
    ELSIF (OLD.has_spouse = TRUE AND NEW.has_spouse = FALSE) OR 
          (NEW.has_spouse = FALSE AND NEW.spouse_details = '{}') THEN
        
        -- Delete existing spouse record
        DELETE FROM attendees 
        WHERE primary_attendee_id = NEW.id AND is_spouse = TRUE;
        
        RAISE NOTICE 'Deleted spouse record for attendee %', NEW.id;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in sync_spouse_attendee_record for attendee %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync spouse records
DROP TRIGGER IF EXISTS after_attendee_update_sync_spouse ON attendees;

CREATE TRIGGER after_attendee_update_sync_spouse
    AFTER INSERT OR UPDATE OF has_spouse, spouse_details, check_in_date, check_out_date, 
           hotel_selection, dining_selections, registration_status, attributes
    ON attendees
    FOR EACH ROW
    EXECUTE FUNCTION sync_spouse_attendee_record();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_spouse_attendee_record() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_spouse_attendee_record() TO anon;