-- Add price_change_4h column to tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS price_change_4h NUMERIC(10, 4) DEFAULT 0;
