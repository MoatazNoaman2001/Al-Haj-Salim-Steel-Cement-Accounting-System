-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v6 - Customer Reservations (محجوز العملاء)
-- Run this in Supabase SQL Editor AFTER migration-v5.sql
-- =====================================================
-- A reservation is a money-balance ledger between a customer
-- (account holder) and a related "partner customer" (e.g. family
-- member or linked client) that handled the operation.
--   credit → reservation deposit (increases balance)
--   debit  → withdrawal / delivery (decreases balance)
-- Display layout: pivot table with one column per partner customer.
-- =====================================================


-- =====================================================
-- 1. TABLE: customer_reservations
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  partner_customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  source_type TEXT,
  source_id UUID,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  row_number SERIAL,
  is_corrected BOOLEAN DEFAULT false,
  correction_of_id UUID REFERENCES customer_reservations(id),
  corrected_by_entry_id UUID REFERENCES customer_reservations(id),
  correction_reason TEXT,
  CONSTRAINT chk_reservation_amounts CHECK (credit >= 0 AND debit >= 0),
  CONSTRAINT chk_reservation_one_side CHECK (
    (credit > 0 AND debit = 0) OR (debit > 0 AND credit = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_reservations_customer
  ON customer_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_partner
  ON customer_reservations(partner_customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date
  ON customer_reservations(entry_date);
CREATE INDEX IF NOT EXISTS idx_reservations_product
  ON customer_reservations(product_id);


-- =====================================================
-- 2. RLS policies (same pattern as customer_transactions)
-- =====================================================
ALTER TABLE customer_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read customer_reservations" ON customer_reservations;
CREATE POLICY "Read customer_reservations" ON customer_reservations
  FOR SELECT USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Insert customer_reservations" ON customer_reservations;
CREATE POLICY "Insert customer_reservations" ON customer_reservations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admin update customer_reservations" ON customer_reservations;
CREATE POLICY "Admin update customer_reservations" ON customer_reservations
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin delete customer_reservations" ON customer_reservations;
CREATE POLICY "Admin delete customer_reservations" ON customer_reservations
  FOR DELETE USING (is_admin());


-- =====================================================
-- 3. VIEW: customer_reservation_balances
-- =====================================================
-- Per-customer running totals (credit, debit, net balance).
-- Used to show reservation summary on customer list/detail pages.
CREATE OR REPLACE VIEW customer_reservation_balances AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  COALESCE(SUM(r.credit) FILTER (WHERE r.is_corrected = false), 0) AS total_credit,
  COALESCE(SUM(r.debit)  FILTER (WHERE r.is_corrected = false), 0) AS total_debit,
  COALESCE(SUM(r.credit) FILTER (WHERE r.is_corrected = false), 0)
    - COALESCE(SUM(r.debit) FILTER (WHERE r.is_corrected = false), 0) AS balance
FROM customers c
LEFT JOIN customer_reservations r ON r.customer_id = c.id
GROUP BY c.id, c.name;


-- =====================================================
-- 4. RPC: get_customer_reservation_partners
-- =====================================================
-- Returns the distinct partner customers that have activity for a given
-- customer's reservation account, along with their column totals.
-- Used to render the dynamic pivot columns (e.g. محمد / يوسف).
CREATE OR REPLACE FUNCTION get_customer_reservation_partners(p_customer_id UUID)
RETURNS TABLE(
  partner_customer_id UUID,
  partner_name TEXT,
  total_credit NUMERIC,
  total_debit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.partner_customer_id,
    c.name AS partner_name,
    COALESCE(SUM(r.credit) FILTER (WHERE r.is_corrected = false), 0) AS total_credit,
    COALESCE(SUM(r.debit)  FILTER (WHERE r.is_corrected = false), 0) AS total_debit
  FROM customer_reservations r
  JOIN customers c ON c.id = r.partner_customer_id
  WHERE r.customer_id = p_customer_id
  GROUP BY r.partner_customer_id, c.name
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =====================================================
-- 5. SEED: cement products list (client-provided)
-- =====================================================
-- Inserts the 13 cement product types if missing.
-- Safe to re-run: ON CONFLICT DO NOTHING by (name, category).
-- Note: existing products with the same name are kept untouched.
DO $$
DECLARE
  product_names TEXT[] := ARRAY[
    'مقاوم مصريين',
    'عاده مصريين',
    'سايب مصريين',
    'مقاوم تعمير',
    'عاده ٣٢ تعمير',
    'تشطيبات',
    'سايب تعمير',
    'مقاوم اسيوط',
    'عاده اسيوط',
    'مهندس',
    'الفهد',
    'سايب اسيوط',
    'عاده ٤٢ السهم'
  ];
  p_name TEXT;
BEGIN
  FOREACH p_name IN ARRAY product_names LOOP
    INSERT INTO products (name, category, unit, is_active)
    SELECT p_name, 'cement', 'ton', true
    WHERE NOT EXISTS (
      SELECT 1 FROM products
      WHERE name = p_name AND category = 'cement'
    );
  END LOOP;
END $$;
