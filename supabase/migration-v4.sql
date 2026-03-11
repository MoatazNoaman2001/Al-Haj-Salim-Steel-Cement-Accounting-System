-- =====================================================
-- Al-Haj Salim - Steel & Cement Accounting System
-- Database Migration v4 - Generic Action Requests
-- Run this in Supabase SQL Editor AFTER migration-v3.sql
-- =====================================================

-- =====================================================
-- 1. ACTION REQUESTS (طلبات التعديل والحذف)
-- Generic request table for edit/delete on any entity
-- =====================================================

CREATE TYPE action_type AS ENUM ('edit', 'delete');
CREATE TYPE entity_type AS ENUM ('bank', 'bank_transaction', 'customer', 'customer_transaction');

CREATE TABLE IF NOT EXISTS action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action action_type NOT NULL,
  entity entity_type NOT NULL,
  entity_id UUID NOT NULL,
  proposed_changes JSONB,  -- for edit: { name: "new name", balance: 1000 }
  reason TEXT NOT NULL,
  status correction_status DEFAULT 'pending',  -- reuse existing enum: pending/approved/rejected
  requested_by UUID NOT NULL REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_requests_status ON action_requests(status);
CREATE INDEX IF NOT EXISTS idx_action_requests_entity ON action_requests(entity, entity_id);

ALTER TABLE action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read action_requests" ON action_requests
  FOR SELECT USING (requested_by = auth.uid() OR is_admin());
CREATE POLICY "Insert action_requests" ON action_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND requested_by = auth.uid());
CREATE POLICY "Admin update action_requests" ON action_requests
  FOR UPDATE USING (is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE action_requests;
