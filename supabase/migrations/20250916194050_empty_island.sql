/*
  # Add blocked seats support to seat assignments

  1. Schema Changes
    - Add `is_blocked` column to `seat_assignments` table
    - Add index for efficient blocked seat queries

  2. Data Migration
    - Migrate existing blocked seats from seating configuration to seat assignments
    - Convert unavailableSeats arrays to blocked seat assignment records

  3. Security
    - Maintain existing RLS policies (blocked seats follow same access rules)
*/

-- Add is_blocked column to seat_assignments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seat_assignments' AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE seat_assignments ADD COLUMN is_blocked boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add index for efficient blocked seat queries
CREATE INDEX IF NOT EXISTS idx_seat_assignments_blocked 
ON seat_assignments (seating_configuration_id, is_blocked) 
WHERE is_blocked = true;

-- Migrate existing blocked seats from seating configurations to seat assignments
DO $$
DECLARE
  config_record RECORD;
  unavailable_seat RECORD;
BEGIN
  -- Loop through all seating configurations with classroom layout
  FOR config_record IN 
    SELECT id, layout_config 
    FROM seating_configurations 
    WHERE layout_type = 'classroom' 
    AND layout_config ? 'unavailableSeats'
    AND jsonb_array_length(layout_config->'unavailableSeats') > 0
  LOOP
    -- Loop through unavailable seats in this configuration
    FOR unavailable_seat IN 
      SELECT 
        (seat_data->>'row')::integer as row_num,
        (seat_data->>'column')::integer as col_num
      FROM jsonb_array_elements(config_record.layout_config->'unavailableSeats') as seat_data
    LOOP
      -- Insert blocked seat assignment if it doesn't already exist
      INSERT INTO seat_assignments (
        seating_configuration_id,
        attendee_id,
        table_name,
        seat_number,
        row_number,
        column_number,
        seat_position,
        assignment_type,
        assigned_at,
        notes,
        is_blocked
      ) VALUES (
        config_record.id,
        NULL,
        NULL,
        NULL,
        unavailable_seat.row_num,
        unavailable_seat.col_num,
        '{"x": 0, "y": 0}'::jsonb,
        'blocked',
        NOW(),
        'Migrated from configuration',
        true
      )
      ON CONFLICT (seating_configuration_id, row_number, column_number) 
      DO UPDATE SET 
        is_blocked = true,
        assignment_type = 'blocked',
        notes = 'Migrated from configuration';
    END LOOP;
    
    -- Clear unavailableSeats from the configuration after migration
    UPDATE seating_configurations 
    SET layout_config = layout_config - 'unavailableSeats'
    WHERE id = config_record.id;
  END LOOP;
END $$;