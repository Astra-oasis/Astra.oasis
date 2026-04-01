import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

async function initializeSchema() {
    try {
        const client = await getClient();

        try {
            // Create tokens table
            await client.query(`
        CREATE TABLE IF NOT EXISTS tokens (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          total_supply BIGINT DEFAULT 0,
          owner VARCHAR(255) NOT NULL,
          contract_address VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Create transactions table
            await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
          from_address VARCHAR(255) NOT NULL,
          to_address VARCHAR(255) NOT NULL,
          amount BIGINT NOT NULL,
          transaction_hash VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Create indexes
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tokens_owner ON tokens(owner);
        CREATE INDEX IF NOT EXISTS idx_tokens_contract_address ON tokens(contract_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_token_id ON transactions(token_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
      `);

            return {
                success: true,
                message: 'Database schema initialized successfully',
            };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Database initialization failed',
        };
    }
}

export async function GET(request: NextRequest) {
    const result = await initializeSchema();

    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json(result, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const result = await initializeSchema();

    if (result.success) {
        return NextResponse.json(result);
    } else {
        return NextResponse.json(result, { status: 500 });
    }
}
