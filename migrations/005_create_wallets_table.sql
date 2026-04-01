-- Create wallets table to store wallet/user information
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url VARCHAR(255),
  bio TEXT,
  -- Array fields to track owned and minted coins
  owned_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
  minted_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Timestamp tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_display_name ON wallets(display_name);
