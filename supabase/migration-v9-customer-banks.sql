-- ============================================================
-- v9: Customer bank accounts
-- Each customer can have multiple bank accounts on record.
-- daily_cement gains customer_bank_id to track which customer
-- account a payment came FROM (company bank_id = where it went TO).
-- ============================================================

-- 1. Customer bank accounts table
CREATE TABLE IF NOT EXISTS customer_bank_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bank_name      TEXT        NOT NULL,
  account_number TEXT,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cba_customer_active
  ON customer_bank_accounts(customer_id)
  WHERE is_active = TRUE;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_bank_account_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cba_updated_at ON customer_bank_accounts;
CREATE TRIGGER trg_cba_updated_at
  BEFORE UPDATE ON customer_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_customer_bank_account_updated_at();

-- 2. Link daily_cement → customer_bank_accounts
--    Records which of the customer's accounts the payment came FROM.
--    Nullable — cash payments have no customer bank account.
ALTER TABLE daily_cement
  ADD COLUMN IF NOT EXISTS customer_bank_id UUID
    REFERENCES customer_bank_accounts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE customer_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cba_select_authenticated" ON customer_bank_accounts;
CREATE POLICY "cba_select_authenticated"
  ON customer_bank_accounts FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "cba_insert_authenticated" ON customer_bank_accounts;
CREATE POLICY "cba_insert_authenticated"
  ON customer_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "cba_update_authenticated" ON customer_bank_accounts;
CREATE POLICY "cba_update_authenticated"
  ON customer_bank_accounts FOR UPDATE
  TO authenticated
  USING (TRUE);
