-- Migration V5: Add driver_name column to daily_cement
-- This adds a field for tracking the driver (السائق) for each cement delivery

ALTER TABLE daily_cement ADD COLUMN IF NOT EXISTS driver_name TEXT;
