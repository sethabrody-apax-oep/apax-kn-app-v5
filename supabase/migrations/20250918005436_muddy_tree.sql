/*
  # Add company description field

  1. New Columns
    - `standardized_companies`
      - `description` (text, nullable, default empty string)

  2. Changes
    - Add description field to store company overview/description information
    - Field is optional and defaults to empty string
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standardized_companies' AND column_name = 'description'
  ) THEN
    ALTER TABLE standardized_companies ADD COLUMN description text DEFAULT ''::text;
  END IF;
END $$;