import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const client = await getClient();

        try {
            // Create purchases table
            await client.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id SERIAL PRIMARY KEY,
          token_id INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
                    buyer_address VARCHAR(255),
          seller_address VARCHAR(255),
                    quantity NUMERIC(36, 18),
                    quantity_ciphertext TEXT,
                    is_private BOOLEAN NOT NULL DEFAULT FALSE,
                    visibility_source VARCHAR(20) NOT NULL DEFAULT 'public',
          price_per_token NUMERIC(36, 18) NOT NULL,
          total_price NUMERIC(36, 18) NOT NULL,
          transaction_hash VARCHAR(255),
          status VARCHAR(50) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Create indexes
            await client.query(`
        CREATE INDEX IF NOT EXISTS idx_purchases_token_id ON purchases(token_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_address);
        CREATE INDEX IF NOT EXISTS idx_purchases_seller ON purchases(seller_address);
                CREATE INDEX IF NOT EXISTS idx_purchases_is_private ON purchases(is_private);
      `);

            return NextResponse.json({
                success: true,
                message: 'Purchases table created successfully',
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Database initialization failed',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const result = await GET(request);
    return result;
}
