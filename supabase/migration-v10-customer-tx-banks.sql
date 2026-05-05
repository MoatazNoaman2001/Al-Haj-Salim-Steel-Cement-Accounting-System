-- ============================================================
-- v10: Wire bank_id and customer_bank_id into customer_transactions
-- so the customer statement can show:
--   من <customer bank>  ←  إلى <company bank>
--
-- Before this migration, bank info was only carried via
-- (source_type='bank', source_id=bank_id) for manual payments.
-- Cement-triggered rows had no bank link at all.
-- ============================================================

BEGIN;

-- 1. Add explicit FK columns (nullable; cash transactions have neither)
ALTER TABLE customer_transactions
  ADD COLUMN IF NOT EXISTS bank_id          UUID REFERENCES banks(id)                  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_bank_id UUID REFERENCES customer_bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ct_bank_id          ON customer_transactions(bank_id)          WHERE bank_id          IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ct_customer_bank_id ON customer_transactions(customer_bank_id) WHERE customer_bank_id IS NOT NULL;

-- 2. Backfill from existing data
--    a) Manual rows with source_type='bank' → source_id was a bank_id
UPDATE customer_transactions
SET bank_id = source_id::uuid
WHERE bank_id IS NULL
  AND source_type = 'bank'
  AND source_id IS NOT NULL;

--    b) Cement-triggered rows → copy from daily_cement
UPDATE customer_transactions ct
SET bank_id          = dc.bank_id,
    customer_bank_id = dc.customer_bank_id
FROM daily_cement dc
WHERE ct.bank_id IS NULL
  AND ct.source_type IN ('cement', 'steel')
  AND ct.source_id IS NOT NULL
  AND ct.source_id::uuid = dc.id;

-- 3. Update the cement → customer trigger to populate both columns going forward
CREATE OR REPLACE FUNCTION sync_cement_to_customer_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name     TEXT;
  v_product_category TEXT;
  v_debit            NUMERIC(14,2);
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
    debit, credit, notes,
    source_type, source_id,
    bank_id, customer_bank_id,
    created_by
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
    NEW.bank_id,
    NEW.customer_bank_id,
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

COMMIT;

-- ============================================================
-- Sanity checks (run manually):
--   SELECT COUNT(*) FROM customer_transactions WHERE bank_id          IS NOT NULL;
--   SELECT COUNT(*) FROM customer_transactions WHERE customer_bank_id IS NOT NULL;
-- ============================================================
