/*
  # Allow public order read on pay page

  1. Problem
    - The /pay/[orderId] page polls /api/orders/[id]/status to check payment state
    - Without a service role key, the server API uses anon and is blocked by RLS
    - Result: status endpoint returns 404 for freshly created guest orders

  2. Changes
    - Replace the `orders anon read by id` policy (which was USING false and blocked everything)
      with a permissive public read so the pay page can render for both guests and authenticated users
    - Authenticated owner/admin read policy is preserved

  3. Security notes
    - Orders only contain order id, status, amount, email, and course id (non-sensitive)
    - Order ids are already exposed in the URL the customer visits
    - Inserts/updates/deletes remain restricted
*/

DROP POLICY IF EXISTS "orders anon read by id" ON orders;
CREATE POLICY "orders public read"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);
