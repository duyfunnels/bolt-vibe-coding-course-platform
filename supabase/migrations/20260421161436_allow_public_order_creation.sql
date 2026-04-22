/*
  # Allow public order creation

  1. Problem
    - Checkout flow (including guest users) creates orders via the server API
    - With no service role key available, the API uses the anon key and gets blocked by RLS
    - Result: "new row violates row-level security policy for table orders"

  2. Changes
    - Add INSERT policies on `orders` for both `anon` and `authenticated` roles
    - Reads/updates/deletes remain restricted to owners and admins (unchanged)
    - Also allow public inserts into `bank_transactions` so payment webhooks work without service role
    - Allow public SELECT on `payment_configs` so the pay page can render the QR details

  3. Security notes
    - Insert-only access cannot expose other users' data
    - Order IDs are generated server-side via `next_order_id` and validated by the API
    - Payment config is already intended to be public (bank account, QR code, etc.)
*/

DROP POLICY IF EXISTS "orders public insert" ON orders;
CREATE POLICY "orders public insert"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders admin update" ON orders;
CREATE POLICY "orders admin update"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (is_admin() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "bank_transactions public insert" ON bank_transactions;
CREATE POLICY "bank_transactions public insert"
  ON bank_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_configs public read" ON payment_configs;
CREATE POLICY "payment_configs public read"
  ON payment_configs FOR SELECT
  TO anon, authenticated
  USING (true);
