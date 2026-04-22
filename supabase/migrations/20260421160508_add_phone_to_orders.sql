/*
  # Add phone to orders

  1. Changes
    - Add `phone` column (text, default '') to `orders` table for customer contact number captured at checkout

  2. Notes
    - Defaults to empty string to keep existing orders valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN phone text DEFAULT '' NOT NULL;
  END IF;
END $$;
