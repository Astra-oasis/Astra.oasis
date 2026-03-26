-- Migration: Add Token Metrics Columns
-- Description: Adds marketcap, volume, price changes, and trader count tracking

ALTER TABLE tokens ADD COLUMN IF NOT EXISTS marketcap NUMERIC(36, 18) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS volume_24h NUMERIC(36, 18) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_5m NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_1h NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_change_6h NUMERIC(10, 4) DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS trader_count INTEGER DEFAULT 0;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_snapshot_time TIMESTAMP;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS price_snapshot_value NUMERIC(36, 18);

-- Create index for faster metric queries
CREATE INDEX IF NOT EXISTS idx_tokens_marketcap ON tokens(marketcap DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume_24h ON tokens(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_trader_count ON tokens(trader_count DESC);

-- Verify columns were added
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'tokens'
ORDER BY ordinal_position;
