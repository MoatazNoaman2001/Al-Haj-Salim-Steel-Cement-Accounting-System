-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration (v2)
-- Run this in Supabase SQL Editor
-- =====================================================
-- NOTE: If you already ran v1, see migration-update.sql
-- for incremental changes only.
-- =====================================================

-- =====================================================
-- 1. TYPES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'cashier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE correction_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================
-- 2. TABLES
-- =====================================================

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers (العملاء)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products (المنتجات)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'cement',
  unit TEXT DEFAULT 'ton',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Cement (يومية الاسمنت) - Core table
CREATE TABLE IF NOT EXISTS daily_cement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10,3) NOT NULL,
  price_per_ton NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(14,2) GENERATED ALWAYS AS (quantity * price_per_ton) STORED,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(14,2) GENERATED ALWAYS AS ((quantity * price_per_ton) - amount_paid) STORED,
  transport_cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT,

  -- Profit (admin only)
  cost_per_ton NUMERIC(12,2),
  profit_per_ton NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE WHEN cost_per_ton IS NOT NULL THEN price_per_ton - cost_per_ton ELSE NULL END
  ) STORED,
  total_profit NUMERIC(14,2) GENERATED ALWAYS AS (
    CASE WHEN cost_per_ton IS NOT NULL THEN (price_per_ton - cost_per_ton) * quantity ELSE NULL END
  ) STORED,

  -- Audit trail (no deletion ever)
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES daily_cement(id),
  corrected_by_entry_id UUID REFERENCES daily_cement(id),
  correction_reason TEXT,

  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL
);

CREATE INDEX IF NOT EXISTS idx_cement_date ON daily_cement(entry_date);
CREATE INDEX IF NOT EXISTS idx_cement_customer ON daily_cement(customer_id);
CREATE INDEX IF NOT EXISTS idx_cement_created_by ON daily_cement(created_by);

-- Correction Requests (طلبات التصحيح)
CREATE TABLE IF NOT EXISTS correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES daily_cement(id),
  proposed_changes JSONB NOT NULL,
  reason TEXT NOT NULL,
  status correction_status DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  new_entry_id UUID REFERENCES daily_cement(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =====================================================
-- 3. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'cashier'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- =====================================================
-- 5. CORRECTION APPROVAL RPC (Atomic Transaction)
-- =====================================================

CREATE OR REPLACE FUNCTION approve_correction(p_request_id UUID, p_admin_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request correction_requests%ROWTYPE;
  v_original daily_cement%ROWTYPE;
  v_new_entry_id UUID;
  v_changes JSONB;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can approve corrections';
  END IF;

  SELECT * INTO v_request FROM correction_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Correction request not found or already processed';
  END IF;

  SELECT * INTO v_original FROM daily_cement WHERE id = v_request.entry_id;
  v_changes := v_request.proposed_changes;

  -- Create new corrected entry
  INSERT INTO daily_cement (
    entry_date, customer_id, product_id, quantity, price_per_ton,
    amount_paid, transport_cost, notes, cost_per_ton,
    correction_of_id, correction_reason, created_by
  ) VALUES (
    v_original.entry_date,
    COALESCE((v_changes->>'customer_id')::UUID, v_original.customer_id),
    COALESCE((v_changes->>'product_id')::UUID, v_original.product_id),
    COALESCE((v_changes->>'quantity')::NUMERIC, v_original.quantity),
    COALESCE((v_changes->>'price_per_ton')::NUMERIC, v_original.price_per_ton),
    COALESCE((v_changes->>'amount_paid')::NUMERIC, v_original.amount_paid),
    COALESCE((v_changes->>'transport_cost')::NUMERIC, v_original.transport_cost),
    COALESCE(v_changes->>'notes', v_original.notes),
    v_original.cost_per_ton,
    v_original.id,
    v_request.reason,
    v_original.created_by
  ) RETURNING id INTO v_new_entry_id;

  -- Mark original as corrected
  UPDATE daily_cement
  SET is_corrected = true, corrected_by_entry_id = v_new_entry_id, updated_at = now()
  WHERE id = v_original.id;

  -- Update the correction request
  UPDATE correction_requests
  SET status = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      new_entry_id = v_new_entry_id
  WHERE id = p_request_id;

  RETURN v_new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cement ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Admin manage profiles" ON profiles
  FOR ALL USING (is_admin());

-- Customers: all authenticated read, admin manage
CREATE POLICY "Authenticated read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin insert customers" ON customers
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update customers" ON customers
  FOR UPDATE USING (is_admin());

-- Products: all authenticated read, admin manage
CREATE POLICY "Authenticated read products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin insert products" ON products
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update products" ON products
  FOR UPDATE USING (is_admin());

-- Daily Cement: cashier sees own, admin sees all. NO DELETE POLICY.
CREATE POLICY "Read cement entries" ON daily_cement
  FOR SELECT USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Insert cement entries" ON daily_cement
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Admin update cement entries" ON daily_cement
  FOR UPDATE USING (is_admin());

-- Correction Requests: own + admin
CREATE POLICY "Read correction requests" ON correction_requests
  FOR SELECT USING (requested_by = auth.uid() OR is_admin());
CREATE POLICY "Insert correction requests" ON correction_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND requested_by = auth.uid());
CREATE POLICY "Admin update correction requests" ON correction_requests
  FOR UPDATE USING (is_admin());


-- =====================================================
-- 7. DAILY INVENTORY / جدول البونات (Stock Tracking)
-- =====================================================
-- Tracks cement stock per product type per day.
-- المباع (sold) is computed from daily_cement on the frontend.
-- الباقي = previous_balance + added - sold (frontend)
-- تكلفة الرصيد المتبقي = الباقي × cost_price (frontend)

CREATE TABLE IF NOT EXISTS daily_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID NOT NULL REFERENCES products(id),
  previous_balance NUMERIC(10,3) NOT NULL DEFAULT 0,
  added NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entry_date, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_date ON daily_inventory(entry_date);

ALTER TABLE daily_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read inventory" ON daily_inventory
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Insert inventory" ON daily_inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Update inventory" ON daily_inventory
  FOR UPDATE USING (created_by = auth.uid() OR is_admin());


-- =====================================================
-- 8. CASH BALANCE TRACKING (رصيد نقدي)
-- =====================================================
-- Formula: رصيد نقدي = opening_balance + total_sales - total_deposits

CREATE TABLE IF NOT EXISTS daily_cash_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_date DATE NOT NULL UNIQUE,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_balance_date ON daily_cash_balance(balance_date);

ALTER TABLE daily_cash_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read cash balance" ON daily_cash_balance
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage cash balance" ON daily_cash_balance
  FOR ALL USING (is_admin());


-- =====================================================
-- 9. DAILY DEPOSITS / الايداعات
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL
);

CREATE INDEX IF NOT EXISTS idx_deposits_date ON daily_deposits(entry_date);

ALTER TABLE daily_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read deposits" ON daily_deposits
  FOR SELECT USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Insert deposits" ON daily_deposits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Admin delete deposits" ON daily_deposits
  FOR DELETE USING (is_admin());


-- =====================================================
-- 10. CASHIER DAILY LEDGER / يومية الكاشير
-- =====================================================
-- MUST balance to zero daily: total عليه = total له

CREATE TABLE IF NOT EXISTS daily_cashier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,

  -- Audit trail (no deletion)
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES daily_cashier(id),
  corrected_by_entry_id UUID REFERENCES daily_cashier(id),
  correction_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_cashier_date ON daily_cashier(entry_date);
CREATE INDEX IF NOT EXISTS idx_cashier_created_by ON daily_cashier(created_by);

ALTER TABLE daily_cashier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read cashier entries" ON daily_cashier
  FOR SELECT USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Insert cashier entries" ON daily_cashier
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Admin update cashier entries" ON daily_cashier
  FOR UPDATE USING (is_admin());


-- =====================================================
-- 11. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE daily_cement;
ALTER PUBLICATION supabase_realtime ADD TABLE correction_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_cashier;


-- =====================================================
-- 12. SEED DATA
-- =====================================================

-- Cement product types (from actual business data)
INSERT INTO products (name, category, unit) VALUES
  ('مقاوم', 'cement', 'ton'),
  ('عادة 32', 'cement', 'ton'),
  ('عادة 42', 'cement', 'ton'),
  ('تشطيبات', 'cement', 'ton'),
  ('سايب جديد', 'cement', 'ton'),
  ('مقاوم اسيوط', 'cement', 'ton'),
  ('مقاوم مصريين', 'cement', 'ton'),
  ('عادة مصريين', 'cement', 'ton'),
  ('مهندس', 'cement', 'ton')
ON CONFLICT DO NOTHING;

-- Sample customers (from actual data)
INSERT INTO customers (name, phone) VALUES
  ('احمد توفيق', NULL),
  ('اسعد جورج', NULL),
  ('شركة البدري', NULL),
  ('اشرف ديروط', NULL),
  ('حسين كمال', NULL),
  ('طارق أسيوط الجديد', NULL),
  ('احمد هيبك', NULL),
  ('ايمن كمال شكرى', NULL)
ON CONFLICT DO NOTHING;


-- =====================================================
-- AFTER CREATING USERS IN SUPABASE AUTH DASHBOARD:
--    Run this to make a user admin:
--
--    UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
-- =====================================================
