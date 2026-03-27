-- Add private-trade support fields for ROFL-encrypted quantities
ALTER TABLE purchases
  ALTER COLUMN quantity DROP NOT NULL;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS quantity_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_source VARCHAR(20) NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_purchases_is_private ON purchases(is_private);
