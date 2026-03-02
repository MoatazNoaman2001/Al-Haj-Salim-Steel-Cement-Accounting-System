-- =====================================================
-- Al-Haj Salim - v2 UPDATE Migration
-- Run this ONLY if you already ran the v1 migration.
-- This drops the old daily_bonds table and adds new tables.
-- =====================================================

-- Drop the old bonds table (it was wrong - we need inventory instead)
DROP TABLE IF EXISTS daily_bonds CASCADE;

-- =====================================================
-- 7. DAILY INVENTORY / جدول البونات (Stock Tracking)
-- =====================================================

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

CREATE TABLE IF NOT EXISTS daily_cashier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,
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
-- Update realtime (add new tables, remove old bonds)
-- =====================================================

-- Remove old bonds from realtime (ignore error if not exists)
-- ALTER PUBLICATION supabase_realtime DROP TABLE daily_bonds;

ALTER PUBLICATION supabase_realtime ADD TABLE daily_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_cashier;


-- =====================================================
-- Update seed data with correct product names
-- =====================================================

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
