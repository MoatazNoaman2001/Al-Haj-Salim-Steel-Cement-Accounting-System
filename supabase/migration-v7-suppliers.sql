-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v7 - Suppliers (الموردين)
-- Run this in Supabase SQL Editor AFTER migration-v6-reservations.sql
-- =====================================================
-- Mirrors the customers / customer_transactions feature, but with the
-- balance sign INVERTED:
--
--   Customer balance: positive when customer owes us money (debit > credit).
--   Supplier balance: positive when supplier owes us money (credit > debit) —
--                     i.e. when WE have paid more than they delivered.
--
--   debit  → goods / invoices delivered by supplier (we owe them more)
--   credit → payment we sent to supplier (reduces what we owe)
--
-- Running balance = SUM(credit) - SUM(debit)
--   negative → we still owe the supplier
--   positive → supplier holds our credit
-- =====================================================


-- =====================================================
-- 1. TABLE: suppliers
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);


-- =====================================================
-- 2. TABLE: supplier_transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  quantity NUMERIC(14,3),
  price NUMERIC(14,2),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  source_type TEXT,             -- 'bank' | 'cash' | 'manual'
  source_id UUID,               -- bank_id when source_type = 'bank'
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES supplier_transactions(id),
  corrected_by_entry_id UUID REFERENCES supplier_transactions(id),
  correction_reason TEXT,
  CONSTRAINT chk_supplier_tx_amounts CHECK (debit >= 0 AND credit >= 0)
);

CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier
  ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_date
  ON supplier_transactions(entry_date);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_source
  ON supplier_transactions(source_type, source_id);


-- =====================================================
-- 3. RLS policies (same pattern as customer_transactions)
-- =====================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read suppliers" ON suppliers;
CREATE POLICY "Read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Insert suppliers" ON suppliers;
CREATE POLICY "Insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin update suppliers" ON suppliers;
CREATE POLICY "Admin update suppliers" ON suppliers
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin delete suppliers" ON suppliers;
CREATE POLICY "Admin delete suppliers" ON suppliers
  FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Read supplier_transactions" ON supplier_transactions;
CREATE POLICY "Read supplier_transactions" ON supplier_transactions
  FOR SELECT USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Insert supplier_transactions" ON supplier_transactions;
CREATE POLICY "Insert supplier_transactions" ON supplier_transactions
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admin update supplier_transactions" ON supplier_transactions;
CREATE POLICY "Admin update supplier_transactions" ON supplier_transactions
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin delete supplier_transactions" ON supplier_transactions;
CREATE POLICY "Admin delete supplier_transactions" ON supplier_transactions
  FOR DELETE USING (is_admin());


-- =====================================================
-- 4. VIEW: supplier_balances
-- =====================================================
-- Per-supplier totals. NOTE: balance = credit - debit (inverted from
-- customer_balances). Negative balance → we still owe the supplier.
CREATE OR REPLACE VIEW supplier_balances AS
SELECT
  s.id,
  s.name,
  s.phone,
  s.address,
  s.notes,
  s.is_active,
  s.created_at,
  COALESCE(SUM(st.debit)  FILTER (WHERE st.is_corrected = false), 0) AS total_debit,
  COALESCE(SUM(st.credit) FILTER (WHERE st.is_corrected = false), 0) AS total_credit,
  COALESCE(SUM(st.credit) FILTER (WHERE st.is_corrected = false), 0)
    - COALESCE(SUM(st.debit) FILTER (WHERE st.is_corrected = false), 0) AS balance
FROM suppliers s
LEFT JOIN supplier_transactions st ON st.supplier_id = s.id
GROUP BY s.id, s.name, s.phone, s.address, s.notes, s.is_active, s.created_at;
