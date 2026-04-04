-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v5 - Customer Account Auto-Sync
-- Run this in Supabase SQL Editor AFTER migration-v4.sql
-- =====================================================
-- This migration connects daily_cement (sales) to
-- customer_transactions (customer ledger) automatically.
-- Every sale creates a DEBIT entry. Corrections cascade.
-- =====================================================


-- =====================================================
-- 1. TRIGGER: daily_cement INSERT → customer_transactions DEBIT
-- =====================================================
-- When a new cement/steel sale is recorded, auto-create
-- a debit entry in the customer's account ledger.
-- Skips corrected entries (is_corrected = true).

CREATE OR REPLACE FUNCTION sync_cement_to_customer_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name TEXT;
  v_product_category TEXT;
  v_total NUMERIC(14,2);
BEGIN
  -- Skip if this entry is already marked as corrected (old entry being replaced)
  IF NEW.is_corrected = true THEN
    RETURN NEW;
  END IF;

  -- Get product info for the description
  SELECT name, category INTO v_product_name, v_product_category
  FROM products WHERE id = NEW.product_id;

  -- Calculate total (same as generated column: quantity * price_per_ton)
  v_total := NEW.quantity * NEW.price_per_ton;

  -- Create debit entry in customer_transactions
  INSERT INTO customer_transactions (
    customer_id,
    entry_date,
    description,
    quantity,
    price,
    debit,
    credit,
    notes,
    source_type,
    source_id,
    created_by
  ) VALUES (
    NEW.customer_id,
    NEW.entry_date,
    v_product_name,
    NEW.quantity,
    NEW.price_per_ton,
    v_total,          -- عليه (debit = what customer owes)
    0,
    NEW.notes,
    v_product_category,  -- 'cement' or 'steel'
    NEW.id,              -- link back to daily_cement entry
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cement_to_customer_tx ON daily_cement;
CREATE TRIGGER trg_cement_to_customer_tx
  AFTER INSERT ON daily_cement
  FOR EACH ROW
  EXECUTE FUNCTION sync_cement_to_customer_transaction();


-- =====================================================
-- 2. TRIGGER: daily_cement correction → cascade to customer_transactions
-- =====================================================
-- When a daily_cement entry is marked is_corrected = true,
-- also mark the linked customer_transaction as corrected.

CREATE OR REPLACE FUNCTION cascade_cement_correction_to_customer_tx()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_tx_id UUID;
  v_new_customer_tx_id UUID;
BEGIN
  -- Only fire when is_corrected changes from false to true
  IF OLD.is_corrected = false AND NEW.is_corrected = true THEN

    -- Find the linked customer_transaction
    SELECT id INTO v_customer_tx_id
    FROM customer_transactions
    WHERE source_id = OLD.id
      AND source_type IN ('cement', 'steel')
      AND is_corrected = false
    LIMIT 1;

    IF v_customer_tx_id IS NOT NULL THEN
      -- Find the NEW customer_transaction that was created by the correction entry
      -- (the new daily_cement entry INSERT trigger already created it)
      IF NEW.corrected_by_entry_id IS NOT NULL THEN
        SELECT id INTO v_new_customer_tx_id
        FROM customer_transactions
        WHERE source_id = NEW.corrected_by_entry_id
          AND source_type IN ('cement', 'steel')
          AND is_corrected = false
        LIMIT 1;
      END IF;

      -- Mark the old customer_transaction as corrected
      UPDATE customer_transactions
      SET is_corrected = true,
          corrected_by_entry_id = v_new_customer_tx_id,
          correction_reason = NEW.correction_reason
      WHERE id = v_customer_tx_id;

      -- Link the new customer_transaction back to the old one
      IF v_new_customer_tx_id IS NOT NULL THEN
        UPDATE customer_transactions
        SET correction_of_id = v_customer_tx_id
        WHERE id = v_new_customer_tx_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cement_correction_cascade ON daily_cement;
CREATE TRIGGER trg_cement_correction_cascade
  AFTER UPDATE ON daily_cement
  FOR EACH ROW
  EXECUTE FUNCTION cascade_cement_correction_to_customer_tx();


-- =====================================================
-- 3. INDEX: Faster lookups on customer_transactions.source_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_tx_source
  ON customer_transactions(source_type, source_id);


-- =====================================================
-- 4. VIEW: Customer balance summary (for customer list page)
-- =====================================================
-- Aggregates total debit, credit, and net balance per customer.
-- Used by Option A (balance columns on customer list).

CREATE OR REPLACE VIEW customer_balances AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  c.notes,
  c.is_active,
  c.created_at,
  COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0) AS total_debit,
  COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS total_credit,
  COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0)
    - COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS balance
FROM customers c
LEFT JOIN customer_transactions ct ON ct.customer_id = c.id
GROUP BY c.id, c.name, c.phone, c.address, c.notes, c.is_active, c.created_at;


-- =====================================================
-- 5. RPC: Backfill existing daily_cement → customer_transactions
-- =====================================================
-- Run this ONCE after deploying the triggers.
-- Uses date range to avoid heavy queries.
-- Call: SELECT backfill_customer_transactions('2026-01-01', '2026-04-04');

CREATE OR REPLACE FUNCTION backfill_customer_transactions(
  p_from_date DATE DEFAULT '2026-01-01',
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec RECORD;
  v_product_name TEXT;
  v_product_category TEXT;
  v_total NUMERIC(14,2);
BEGIN
  -- Only admins can run backfill
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can run backfill';
  END IF;

  FOR v_rec IN
    SELECT dc.*
    FROM daily_cement dc
    WHERE dc.entry_date BETWEEN p_from_date AND p_to_date
      AND dc.is_corrected = false
      -- Skip entries that already have a linked customer_transaction
      AND NOT EXISTS (
        SELECT 1 FROM customer_transactions ct
        WHERE ct.source_id = dc.id
          AND ct.source_type IN ('cement', 'steel')
          AND ct.is_corrected = false
      )
    ORDER BY dc.entry_date, dc.row_number
  LOOP
    SELECT name, category INTO v_product_name, v_product_category
    FROM products WHERE id = v_rec.product_id;

    v_total := v_rec.quantity * v_rec.price_per_ton;

    INSERT INTO customer_transactions (
      customer_id, entry_date, description,
      quantity, price, debit, credit,
      notes, source_type, source_id, created_by
    ) VALUES (
      v_rec.customer_id, v_rec.entry_date, v_product_name,
      v_rec.quantity, v_rec.price_per_ton, v_total, 0,
      v_rec.notes, v_product_category, v_rec.id, v_rec.created_by
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 6. RPC: Get customer balance (lightweight single-customer query)
-- =====================================================
-- Used by Option D (global search) and Option B (combobox).

CREATE OR REPLACE FUNCTION get_customer_balance(p_customer_id UUID)
RETURNS TABLE(total_debit NUMERIC, total_credit NUMERIC, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0) AS total_debit,
    COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS total_credit,
    COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0)
      - COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS balance
  FROM customer_transactions ct
  WHERE ct.customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- =====================================================
-- 7. RPC: Search customers with balance (for global search - Option D)
-- =====================================================

CREATE OR REPLACE FUNCTION search_customers_with_balance(p_search TEXT DEFAULT '')
RETURNS TABLE(
  id UUID,
  name TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.phone,
    c.address,
    c.is_active,
    COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0) AS total_debit,
    COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS total_credit,
    COALESCE(SUM(ct.debit) FILTER (WHERE ct.is_corrected = false), 0)
      - COALESCE(SUM(ct.credit) FILTER (WHERE ct.is_corrected = false), 0) AS balance
  FROM customers c
  LEFT JOIN customer_transactions ct ON ct.customer_id = c.id
  WHERE c.is_active = true
    AND (
      p_search = ''
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
    )
  GROUP BY c.id, c.name, c.phone, c.address, c.is_active
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
