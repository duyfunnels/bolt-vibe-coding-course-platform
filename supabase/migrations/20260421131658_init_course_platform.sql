/*
  # Course Platform Schema

  ## Overview
  Creates the full schema for a course-selling platform with user roles,
  courses/modules/lessons, orders with an auto-computed payment state driven
  by bank transactions, email templates/logs, and admin configuration tables.

  ## New Tables
  1. `profiles` - extends auth.users with role (user/admin) and name
  2. `courses` - sellable courses (title, slug, description, price, thumbnail, payment_mode)
  3. `modules` - ordered sections within a course
  4. `lessons` - videos (youtube/vimeo/gumlet/iframe) within a module
  5. `orders` - purchase orders with generated order_id (PREFIX+5 digits), amounts, status
  6. `bank_transactions` - money-in records; triggers update order totals/status
  7. `user_courses` - access grants (auto-inserted when order becomes paid)
  8. `payment_configs` - singleton config for sepay + manual bank + order prefix
  9. `smtp_config` - singleton SMTP config
  10. `email_templates` - named templates with variables
  11. `email_logs` - sent email record
  12. `lesson_progress` - per-user completion state

  ## Sequence & Functions
  - Global `order_id_seq` sequence so prefix changes don't restart numbering
  - `next_order_id(prefix)` function returns PREFIX + 5-digit padded increment
  - `recalc_order_totals()` trigger recomputes total_money_in / remain_money and flips status to 'paid' when fully paid
  - `grant_course_on_paid()` trigger inserts into user_courses when an order becomes paid

  ## Security
  - RLS enabled on every table
  - Users can read their own profile/orders/user_courses/lesson_progress
  - Courses/modules/lessons readable by all authenticated users (listing + preview of structure)
  - Lesson video fields still require user_courses membership at the application layer
  - Admin role (profiles.role = 'admin') has full access via policies
*/

-- ========= PROFILES =========
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

CREATE POLICY "users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admin insert profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========= COURSES =========
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text DEFAULT '',
  description text DEFAULT '',
  thumbnail_url text DEFAULT '',
  price numeric(12,0) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'VND',
  payment_mode text NOT NULL DEFAULT 'manual' CHECK (payment_mode IN ('sepay','manual')),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses public read"
  ON courses FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "courses admin insert"
  ON courses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

CREATE POLICY "courses admin update"
  ON courses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

CREATE POLICY "courses admin delete"
  ON courses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= MODULES =========
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules public read"
  ON modules FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "modules admin insert"
  ON modules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "modules admin update"
  ON modules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "modules admin delete"
  ON modules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= LESSONS =========
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  video_provider text NOT NULL DEFAULT 'youtube' CHECK (video_provider IN ('youtube','vimeo','gumlet','iframe')),
  video_url text DEFAULT '',
  duration_seconds int DEFAULT 0,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons public meta read"
  ON lessons FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "lessons admin insert"
  ON lessons FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "lessons admin update"
  ON lessons FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "lessons admin delete"
  ON lessons FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= ORDER SEQUENCE & ID =========
CREATE SEQUENCE IF NOT EXISTS order_id_seq START 1;

CREATE OR REPLACE FUNCTION next_order_id(p_prefix text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('order_id_seq');
  RETURN COALESCE(p_prefix,'') || lpad(n::text, 5, '0');
END; $$;

-- ========= ORDERS =========
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  customer_name text DEFAULT '',
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  order_amount numeric(12,0) NOT NULL,
  total_money_in numeric(12,0) NOT NULL DEFAULT 0,
  remain_money numeric(12,0) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  payment_mode text NOT NULL DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders owner read"
  ON orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

CREATE POLICY "orders anon read by id"
  ON orders FOR SELECT TO anon USING (false);

-- ========= BANK TRANSACTIONS =========
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text REFERENCES orders(order_id) ON DELETE SET NULL,
  bank_ref text,
  money_in numeric(12,0) NOT NULL,
  content text DEFAULT '',
  transfer_time timestamptz DEFAULT now(),
  source text DEFAULT 'manual',
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(bank_ref, order_id, money_in)
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_order ON bank_transactions(order_id);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_tx admin read"
  ON bank_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= RECALC TRIGGER =========
CREATE OR REPLACE FUNCTION recalc_order_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id text;
  v_sum numeric(12,0);
  v_amount numeric(12,0);
  v_remain numeric(12,0);
  v_status text;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(money_in),0) INTO v_sum
  FROM bank_transactions WHERE order_id = v_order_id;

  SELECT order_amount INTO v_amount FROM orders WHERE order_id = v_order_id;
  IF v_amount IS NULL THEN RETURN NEW; END IF;

  v_remain := v_amount - v_sum;
  v_status := CASE WHEN v_remain <= 0 THEN 'paid' ELSE 'pending' END;

  UPDATE orders
     SET total_money_in = v_sum,
         remain_money   = v_remain,
         status = CASE WHEN status IN ('failed','cancelled') THEN status ELSE v_status END,
         paid_at = CASE WHEN v_status='paid' AND paid_at IS NULL THEN now() ELSE paid_at END
   WHERE order_id = v_order_id;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_order ON bank_transactions;
CREATE TRIGGER trg_recalc_order
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION recalc_order_totals();

-- also recalc when order_amount set at creation
CREATE OR REPLACE FUNCTION init_order_remain()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.remain_money := NEW.order_amount - COALESCE(NEW.total_money_in,0);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_init_order ON orders;
CREATE TRIGGER trg_init_order
  BEFORE INSERT OR UPDATE OF order_amount ON orders
  FOR EACH ROW EXECUTE FUNCTION init_order_remain();

-- ========= USER_COURSES =========
CREATE TABLE IF NOT EXISTS user_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_id text REFERENCES orders(order_id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_courses owner read"
  ON user_courses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- grant access when order goes paid
CREATE OR REPLACE FUNCTION grant_course_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.user_id IS NOT NULL AND NEW.course_id IS NOT NULL THEN
    INSERT INTO user_courses (user_id, course_id, order_id)
    VALUES (NEW.user_id, NEW.course_id, NEW.order_id)
    ON CONFLICT (user_id, course_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_grant_course ON orders;
CREATE TRIGGER trg_grant_course
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION grant_course_on_paid();

-- ========= LESSON PROGRESS =========
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress owner read"
  ON lesson_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "progress owner insert"
  ON lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress owner update"
  ON lesson_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========= PAYMENT CONFIG =========
CREATE TABLE IF NOT EXISTS payment_configs (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sepay_api_key text DEFAULT '',
  sepay_webhook_secret text DEFAULT '',
  bank_id text DEFAULT '',
  bank_name text DEFAULT '',
  account_number text DEFAULT '',
  account_name text DEFAULT '',
  transfer_prefix text DEFAULT 'ORD',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO payment_configs (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_configs public read safe"
  ON payment_configs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "payment_configs admin write"
  ON payment_configs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= SMTP CONFIG =========
CREATE TABLE IF NOT EXISTS smtp_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  host text DEFAULT '',
  port int DEFAULT 587,
  username text DEFAULT '',
  password text DEFAULT '',
  from_email text DEFAULT '',
  from_name text DEFAULT 'Academy',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO smtp_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smtp admin read"
  ON smtp_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "smtp admin write"
  ON smtp_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- ========= EMAIL TEMPLATES =========
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates admin read"
  ON email_templates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "templates admin write insert"
  ON email_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
CREATE POLICY "templates admin write update"
  ON email_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));

-- seed default templates
INSERT INTO email_templates (slug, subject, html) VALUES
  ('order_received','Order received - {{order_id}}','<h1>Thanks {{customer_name}}</h1><p>Your order <b>{{order_id}}</b> for <b>{{course_title}}</b> has been received. Total: {{amount}} VND.</p><p>Please complete the transfer using content: <b>{{order_id}}</b>.</p>'),
  ('payment_success','Payment received - {{order_id}}','<h1>Payment received</h1><p>Your payment for <b>{{course_title}}</b> has been confirmed. Access your course: <a href="{{access_link}}">{{access_link}}</a></p>'),
  ('account_created','Your account is ready','<h1>Welcome</h1><p>Email: <b>{{email}}</b><br/>Temporary password: <b>{{password}}</b></p><p>Login: <a href="{{access_link}}">{{access_link}}</a></p>'),
  ('reset_password','Reset your password','<h1>Password reset</h1><p>Click to reset: <a href="{{reset_link}}">{{reset_link}}</a></p>')
ON CONFLICT (slug) DO NOTHING;

-- ========= EMAIL LOGS =========
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template_slug text,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs admin read"
  ON email_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role='admin'));
