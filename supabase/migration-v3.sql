-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v3 - Banks, Customer Ledger
-- Run this in Supabase SQL Editor AFTER migration.sql
-- =====================================================

-- =====================================================
-- 1. BANK ACCOUNTS (حسابات البنوك)
-- =====================================================

CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read banks" ON banks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage banks" ON banks
  FOR ALL USING (is_admin());

-- Bank Ledger (كشف حساب البنك)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES banks(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES bank_transactions(id),
  corrected_by_entry_id UUID REFERENCES bank_transactions(id),
  correction_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_bank ON bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON bank_transactions(entry_date);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bank_transactions" ON bank_transactions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert bank_transactions" ON bank_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Admin update bank_transactions" ON bank_transactions
  FOR UPDATE USING (is_admin());


-- =====================================================
-- 2. CUSTOMER LEDGER (كشف حساب العميل)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,3),
  price NUMERIC(12,2),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  source_type TEXT,
  source_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES customer_transactions(id),
  corrected_by_entry_id UUID REFERENCES customer_transactions(id),
  correction_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_tx_customer ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tx_date ON customer_transactions(entry_date);

ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read customer_transactions" ON customer_transactions
  FOR SELECT USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Insert customer_transactions" ON customer_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());
CREATE POLICY "Admin update customer_transactions" ON customer_transactions
  FOR UPDATE USING (is_admin());


-- =====================================================
-- 3. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE banks;
ALTER PUBLICATION supabase_realtime ADD TABLE bank_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;


-- =====================================================
-- 4. SEED BANK DATA
-- =====================================================

INSERT INTO banks (name, balance) VALUES
  ('بنك الاهلى (سليم)', 587209),
  ('بنك الاسكندرية هشام شركات', 9158731),
  ('بنك الاسكندرية يوسف شركات', 6137247),
  ('بنك مصر يوسف شركات', 309585),
  ('بنك مصر الشرق شركات', 3092494),
  ('بنك الاسكندرية الشرق شركات', 6093648),
  ('بنك ابو ظبى (الاول)', 513215),
  ('انستا باى بنك الاسكندريه', 1020606),
  ('انستا باي بنك الاهلى', 657289),
  ('فودافون كاش', 76425),
  ('اتصالات كاش', 26549),
  ('البريد المصرى', 115311),
  ('فودافون كاش (جيمى)', 6179),
  ('فودافون كاش (يوسف يوسف)', 23995),
  ('الاهلى (يوسف يوسف)', 1650),
  ('بنك العقارى المصرى العربى', 50000)
ON CONFLICT DO NOTHING;
