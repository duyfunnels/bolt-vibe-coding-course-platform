/*
  # Sepay verification fields

  1. Changes
    - Add `sepay_verified` (bool) to `payment_configs` — true only after the Sepay API key has been validated against the real Sepay API
    - Add `sepay_account_info` (jsonb) to store the bank account(s) returned by Sepay, so the admin UI can show the connected account as "Active" using real data
    - Add `sepay_enabled` (bool) to toggle whether the Sepay webhook auto-confirms orders
    - Add `sepay_verified_at` (timestamptz) to show when the key was last verified

  2. Notes
    - All fields default to safe values so existing rows stay valid
    - No data is lost; manual-bank-transfer config is untouched
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_verified') THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_verified boolean DEFAULT false NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_account_info') THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_account_info jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_enabled') THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_enabled boolean DEFAULT true NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_verified_at') THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_verified_at timestamptz;
  END IF;
END $$;
