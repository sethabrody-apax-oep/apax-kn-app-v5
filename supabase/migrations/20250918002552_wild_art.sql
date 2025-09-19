/*
  # Create agenda item speakers junction table

  1. New Tables
    - `agenda_item_speakers`
      - `id` (uuid, primary key)
      - `agenda_item_id` (uuid, foreign key to agenda_items)
      - `attendee_id` (uuid, foreign key to attendees)
      - `speaker_order` (integer, for ordering multiple speakers)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `agenda_item_speakers` table
    - Add policies for admin users to manage speaker assignments
    - Add policies for public read access to speaker information

  3. Indexes
    - Index on agenda_item_id for efficient lookups
    - Index on attendee_id for reverse lookups
    - Unique constraint on (agenda_item_id, attendee_id) to prevent duplicates

  4. Changes
    - Remove the existing speaker jsonb column from agenda_items table
*/

-- Create the agenda_item_speakers junction table
CREATE TABLE IF NOT EXISTS agenda_item_speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id uuid NOT NULL REFERENCES agenda_items(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES attendees(id) ON DELETE RESTRICT,
  speaker_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate speaker assignments
ALTER TABLE agenda_item_speakers 
ADD CONSTRAINT agenda_item_speakers_unique_assignment 
UNIQUE (agenda_item_id, attendee_id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agenda_item_speakers_agenda_item 
ON agenda_item_speakers(agenda_item_id);

CREATE INDEX IF NOT EXISTS idx_agenda_item_speakers_attendee 
ON agenda_item_speakers(attendee_id);

CREATE INDEX IF NOT EXISTS idx_agenda_item_speakers_order 
ON agenda_item_speakers(agenda_item_id, speaker_order);

-- Enable Row Level Security
ALTER TABLE agenda_item_speakers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin users can manage speaker assignments"
  ON agenda_item_speakers
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Public can read speaker assignments"
  ON agenda_item_speakers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_agenda_item_speakers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agenda_item_speakers_updated_at
  BEFORE UPDATE ON agenda_item_speakers
  FOR EACH ROW
  EXECUTE FUNCTION update_agenda_item_speakers_updated_at();

-- Remove the old speaker jsonb column from agenda_items
-- Note: This is commented out for safety - uncomment if you want to remove the old column
-- ALTER TABLE agenda_items DROP COLUMN IF EXISTS speaker;