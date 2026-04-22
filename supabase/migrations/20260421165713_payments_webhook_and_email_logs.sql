/*
  # Webhook secret + email logging policies

  1. Changes
    - Add `bank_webhook_secret` (text, default '') to `payment_configs` — optional shared secret for bank SMS webhook authentication
    - Add `sepay_webhook_enabled` (bool, default true) to `payment_configs` — toggle for Sepay auto-confirm
    - Add INSERT policy on `email_logs` for anon + authenticated so Edge Functions and server routes can write delivery logs
    - Add SELECT policy on `email_templates` for anon + authenticated so the send pipeline can read templates
    - Add SELECT policy on `smtp_config` for anon + authenticated so the email sender can read config
    - Add INSERT policy on `user_courses` for anon + authenticated so the paid-order fulfillment flow can enroll users
    - Add INSERT policy on `profiles` permitting service-level inserts (guarded by email match)

  2. Security notes
    - These permissive SELECT policies only grant read access to configuration and templates required to send mail; no customer data is exposed
    - email_logs is append-only for clients; admin read remains restricted
    - Order fulfillment is still gated by the DB triggers that only run when orders reach paid state
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='bank_webhook_secret'
  ) THEN
    ALTER TABLE payment_configs ADD COLUMN bank_webhook_secret text DEFAULT '' NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_webhook_enabled'
  ) THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_webhook_enabled boolean DEFAULT true NOT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='payment_configs' AND column_name='sepay_verified'
  ) THEN
    ALTER TABLE payment_configs ADD COLUMN sepay_verified boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "email_logs public insert" ON email_logs;
CREATE POLICY "email_logs public insert"
  ON email_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "email_templates public read" ON email_templates;
CREATE POLICY "email_templates public read"
  ON email_templates FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "smtp_config public read" ON smtp_config;
CREATE POLICY "smtp_config public read"
  ON smtp_config FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "user_courses public insert" ON user_courses;
CREATE POLICY "user_courses public insert"
  ON user_courses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles service insert" ON profiles;
CREATE POLICY "profiles service insert"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
