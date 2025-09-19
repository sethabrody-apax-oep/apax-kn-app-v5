/*
  # Fix raw_attendee_data_idloom table structure

  1. Table Updates
    - Rename columns to match plan specification (event_uid → idloom_event_uid, guest_uid → idloom_guest_uid)
    - Add missing columns (import_reviewed, import_status, last_synced_at)
    - Update constraints and indexes for performance

  2. Security
    - Maintain existing RLS policies
    - Policies automatically apply to new and renamed columns

  3. Data Integrity
    - Add unique constraint on (idloom_event_uid, idloom_guest_uid)
    - Add check constraint for import_status values
    - Create performance indexes
*/

-- Add new columns if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND column_name = 'import_reviewed'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    ADD COLUMN import_reviewed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND column_name = 'import_status'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    ADD COLUMN import_status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Rename existing columns to match plan specification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND column_name = 'event_uid'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    RENAME COLUMN event_uid TO idloom_event_uid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND column_name = 'guest_uid'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    RENAME COLUMN guest_uid TO idloom_guest_uid;
  END IF;
END $$;

-- Add check constraint for import_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND constraint_name = 'raw_attendee_data_idloom_import_status_check'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    ADD CONSTRAINT raw_attendee_data_idloom_import_status_check 
    CHECK (import_status IN ('pending', 'processed', 'failed', 'skipped'));
  END IF;
END $$;

-- Add unique constraint on (idloom_event_uid, idloom_guest_uid) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'raw_attendee_data_idloom' 
    AND constraint_name = 'raw_attendee_data_idloom_event_guest_unique'
  ) THEN
    ALTER TABLE public.raw_attendee_data_idloom 
    ADD CONSTRAINT raw_attendee_data_idloom_event_guest_unique 
    UNIQUE (idloom_event_uid, idloom_guest_uid);
  END IF;
END $$;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_raw_idloom_event_uid 
ON public.raw_attendee_data_idloom USING btree (idloom_event_uid);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_guest_uid 
ON public.raw_attendee_data_idloom USING btree (idloom_guest_uid);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_batch_id 
ON public.raw_attendee_data_idloom USING btree (import_batch_id);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_processed 
ON public.raw_attendee_data_idloom USING btree (processed);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_import_status 
ON public.raw_attendee_data_idloom USING btree (import_status);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_created_at 
ON public.raw_attendee_data_idloom USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_last_synced_at 
ON public.raw_attendee_data_idloom USING btree (last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_raw_idloom_attendee_id 
ON public.raw_attendee_data_idloom USING btree (attendee_id);

-- Update trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_raw_idloom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS update_raw_idloom_updated_at_trigger ON public.raw_attendee_data_idloom;
CREATE TRIGGER update_raw_idloom_updated_at_trigger
  BEFORE UPDATE ON public.raw_attendee_data_idloom
  FOR EACH ROW
  EXECUTE FUNCTION update_raw_idloom_updated_at();