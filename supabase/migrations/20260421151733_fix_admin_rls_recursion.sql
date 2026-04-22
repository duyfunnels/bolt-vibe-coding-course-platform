/*
  # Fix RLS recursion on profiles and admin checks

  ## Problem
  Previous admin policies referenced profiles from inside profiles policies,
  causing infinite recursion when reading own profile. This prevented the
  client from loading role='admin' and hiding the Admin nav link.

  ## Fix
  1. Create SECURITY DEFINER function `is_admin()` that bypasses RLS.
  2. Replace recursive policies on profiles and all other tables that
     referenced `EXISTS (SELECT 1 FROM profiles ...)` with calls to is_admin().

  ## Security
  - is_admin() checks auth.uid() and reads profiles directly (bypassing RLS
    by running as definer). It only returns boolean, never leaks data.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- profiles
DROP POLICY IF EXISTS "users read own profile" ON profiles;
DROP POLICY IF EXISTS "users update own profile" ON profiles;
DROP POLICY IF EXISTS "admin insert profile" ON profiles;

CREATE POLICY "read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "insert profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- courses
DROP POLICY IF EXISTS "courses admin insert" ON courses;
DROP POLICY IF EXISTS "courses admin update" ON courses;
DROP POLICY IF EXISTS "courses admin delete" ON courses;
CREATE POLICY "courses admin insert" ON courses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "courses admin update" ON courses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "courses admin delete" ON courses FOR DELETE TO authenticated USING (public.is_admin());

-- modules
DROP POLICY IF EXISTS "modules admin insert" ON modules;
DROP POLICY IF EXISTS "modules admin update" ON modules;
DROP POLICY IF EXISTS "modules admin delete" ON modules;
CREATE POLICY "modules admin insert" ON modules FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "modules admin update" ON modules FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "modules admin delete" ON modules FOR DELETE TO authenticated USING (public.is_admin());

-- lessons
DROP POLICY IF EXISTS "lessons admin insert" ON lessons;
DROP POLICY IF EXISTS "lessons admin update" ON lessons;
DROP POLICY IF EXISTS "lessons admin delete" ON lessons;
CREATE POLICY "lessons admin insert" ON lessons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "lessons admin update" ON lessons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "lessons admin delete" ON lessons FOR DELETE TO authenticated USING (public.is_admin());

-- orders
DROP POLICY IF EXISTS "orders owner read" ON orders;
CREATE POLICY "orders owner read" ON orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- bank_transactions
DROP POLICY IF EXISTS "bank_tx admin read" ON bank_transactions;
CREATE POLICY "bank_tx admin read" ON bank_transactions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "bank_tx admin insert" ON bank_transactions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "bank_tx admin update" ON bank_transactions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- user_courses
DROP POLICY IF EXISTS "user_courses owner read" ON user_courses;
CREATE POLICY "user_courses owner read" ON user_courses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "user_courses admin write" ON user_courses FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- payment_configs
DROP POLICY IF EXISTS "payment_configs admin write" ON payment_configs;
CREATE POLICY "payment_configs admin write" ON payment_configs FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- smtp_config
DROP POLICY IF EXISTS "smtp admin read" ON smtp_config;
DROP POLICY IF EXISTS "smtp admin write" ON smtp_config;
CREATE POLICY "smtp admin read" ON smtp_config FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "smtp admin write" ON smtp_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- email_templates
DROP POLICY IF EXISTS "templates admin read" ON email_templates;
DROP POLICY IF EXISTS "templates admin write insert" ON email_templates;
DROP POLICY IF EXISTS "templates admin write update" ON email_templates;
CREATE POLICY "templates admin read" ON email_templates FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "templates admin write insert" ON email_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "templates admin write update" ON email_templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- email_logs
DROP POLICY IF EXISTS "email_logs admin read" ON email_logs;
CREATE POLICY "email_logs admin read" ON email_logs FOR SELECT TO authenticated USING (public.is_admin());
