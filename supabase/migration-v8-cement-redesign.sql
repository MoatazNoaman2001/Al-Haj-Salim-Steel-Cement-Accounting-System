-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v8 - Cement-daily redesign
-- Run this in Supabase SQL Editor AFTER all earlier migrations.
-- =====================================================
--
-- This migration aligns daily_cement with the spreadsheet flow:
--   - sale price (per ton)             = price_per_ton          (existing)
--   - transport collected (flat fee)   = transport_in           (NEW)
--   - transport paid to driver (per ton) = transport_cost      (existing — semantic = "نولون out per ton")
--   - discount given                   = tanzeel                (NEW)
--   - bank that received the payment   = bank_id                (NEW, FK → banks)
--
-- Recomputed generated columns:
--   total_amount        = quantity * price_per_ton                       (unchanged)
--   remaining_balance   = (total_amount + transport_in - tanzeel) - amount_paid
--   total_profit        = (total_amount + transport_in)
--                         - (quantity * cost_per_ton)
--                         - (quantity * transport_cost)
--                         - tanzeel
--                       (NULL when cost_per_ton is NULL — admin hasn't entered cost yet)
--
-- Triggers updated/added:
--   sync_cement_to_customer_transaction  — debit now uses (total + transport_in - tanzeel)
--   sync_cement_to_bank_transaction      — NEW: credits bank_id with amount_paid

BEGIN;

-- =====================================================
-- 1. New columns
-- =====================================================

ALTER TABLE daily_cement
  ADD COLUMN IF NOT EXISTS transport_in NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tanzeel      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_id      UUID REFERENCES banks(id);

CREATE INDEX IF NOT EXISTS idx_cement_bank ON daily_cement(bank_id);

-- =====================================================
-- 2. Drop old generated columns and recreate with new formulas
-- =====================================================
-- Postgres requires GENERATED columns to be dropped/recreated to change their formula.

ALTER TABLE daily_cement DROP COLUMN IF EXISTS remaining_balance;
ALTER TABLE daily_cement DROP COLUMN IF EXISTS profit_per_ton;
ALTER TABLE daily_cement DROP COLUMN IF EXISTS total_profit;

ALTER TABLE daily_cement
  ADD COLUMN remaining_balance NUMERIC(14,2) GENERATED ALWAYS AS (
    (quantity * price_per_ton)
    + COALESCE(transport_in, 0)
    - COALESCE(tanzeel, 0)
    - amount_paid
  ) STORED;

ALTER TABLE daily_cement
  ADD COLUMN total_profit NUMERIC(14,2) GENERATED ALWAYS AS (
    CASE WHEN cost_per_ton IS NULL THEN NULL
    ELSE
      (quantity * price_per_ton)
      + COALESCE(transport_in, 0)
      - (quantity * cost_per_ton)
      - (quantity * COALESCE(transport_cost, 0))
      - COALESCE(tanzeel, 0)
    END
  ) STORED;

-- =====================================================
-- 3. Update customer-debit trigger to use new formula
-- =====================================================
-- The customer's debit is what they OWE for the sale:
--   sale total + transport collected - discount given.
-- amount_paid is recorded separately on the bank side (trigger #4).

CREATE OR REPLACE FUNCTION sync_cement_to_customer_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name TEXT;
  v_product_category TEXT;
  v_debit NUMERIC(14,2);
BEGIN
  IF NEW.is_corrected = true THEN
    RETURN NEW;
  END IF;

  SELECT name, category INTO v_product_name, v_product_category
  FROM products WHERE id = NEW.product_id;

  v_debit := (NEW.quantity * NEW.price_per_ton)
             + COALESCE(NEW.transport_in, 0)
             - COALESCE(NEW.tanzeel, 0);

  INSERT INTO customer_transactions (
    customer_id, entry_date, description, quantity, price,
    debit, credit, notes, source_type, source_id, created_by
  ) VALUES (
    NEW.customer_id,
    NEW.entry_date,
    v_product_name,
    NEW.quantity,
    NEW.price_per_ton,
    v_debit,
    0,
    NEW.notes,
    v_product_category,
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger itself (DROP + CREATE) was already set up in v5; the function body
-- above is what changed. The DROP+CREATE here is idempotent for safety.
DROP TRIGGER IF EXISTS trg_cement_to_customer_tx ON daily_cement;
CREATE TRIGGER trg_cement_to_customer_tx
  AFTER INSERT ON daily_cement
  FOR EACH ROW
  EXECUTE FUNCTION sync_cement_to_customer_transaction();

-- =====================================================
-- 4. NEW: bank-credit trigger
-- =====================================================
-- When a cement sale is recorded with bank_id and amount_paid > 0,
-- credit that amount to the bank's ledger automatically.
-- bank_transactions.credit = money IN to the bank.

CREATE OR REPLACE FUNCTION sync_cement_to_bank_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_product_category TEXT;
BEGIN
  IF NEW.is_corrected = true THEN
    RETURN NEW;
  END IF;
  IF NEW.bank_id IS NULL OR NEW.amount_paid IS NULL OR NEW.amount_paid <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_customer_name FROM customers WHERE id = NEW.customer_id;
  SELECT category INTO v_product_category FROM products WHERE id = NEW.product_id;

  INSERT INTO bank_transactions (
    bank_id, entry_date, description, debit, credit, notes, created_by
  ) VALUES (
    NEW.bank_id,
    NEW.entry_date,
    CASE
      WHEN v_product_category = 'cement' THEN 'بيع أسمنت — ' || COALESCE(v_customer_name, '')
      WHEN v_product_category = 'steel'  THEN 'بيع حديد — '  || COALESCE(v_customer_name, '')
      ELSE 'دفعة عميل — ' || COALESCE(v_customer_name, '')
    END,
    0,
    NEW.amount_paid,
    'مولد تلقائياً من daily_cement#' || NEW.id::text,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cement_to_bank_tx ON daily_cement;
CREATE TRIGGER trg_cement_to_bank_tx
  AFTER INSERT ON daily_cement
  FOR EACH ROW
  EXECUTE FUNCTION sync_cement_to_bank_transaction();

-- =====================================================
-- 5. Cascade bank reversal on cement-correction (optional but safer)
-- =====================================================
-- If you mark a daily_cement row as is_corrected = true and it had created
-- a bank_transactions row, also mark that bank row as is_corrected = true.

CREATE OR REPLACE FUNCTION cascade_cement_correction_to_bank_tx()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_corrected = false AND NEW.is_corrected = true THEN
    UPDATE bank_transactions
    SET is_corrected = true,
        correction_reason = NEW.correction_reason
    WHERE notes = 'مولد تلقائياً من daily_cement#' || OLD.id::text
      AND is_corrected = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cement_correction_to_bank ON daily_cement;
CREATE TRIGGER trg_cement_correction_to_bank
  AFTER UPDATE ON daily_cement
  FOR EACH ROW
  EXECUTE FUNCTION cascade_cement_correction_to_bank_tx();

COMMIT;

-- =====================================================
-- Sanity checks (run manually after migration)
-- =====================================================
-- 1. Recompute one row to verify the new total_profit formula:
--   SELECT id, quantity, price_per_ton, transport_in, transport_cost, tanzeel,
--          cost_per_ton, total_amount, remaining_balance, total_profit
--   FROM daily_cement ORDER BY created_at DESC LIMIT 5;
--
-- 2. Insert a test sale with bank_id + amount_paid and confirm:
--   - customer_transactions has a debit row with amount = total + transport_in - tanzeel
--   - bank_transactions has a credit row with amount = amount_paid
--
-- 3. Mark that test cement row is_corrected = true and confirm both
--    customer_transactions and bank_transactions get the cascade flag.
