import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Create wallets table
        await query(`
            CREATE TABLE IF NOT EXISTS wallets (
                id SERIAL PRIMARY KEY,
                wallet_address VARCHAR(255) NOT NULL UNIQUE,
                display_name VARCHAR(255),
                avatar_url VARCHAR(255),
                bio TEXT,
                owned_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
                minted_coins TEXT[] DEFAULT ARRAY[]::TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
            CREATE INDEX IF NOT EXISTS idx_wallets_display_name ON wallets(display_name);
        `);

        return NextResponse.json({
            success: true,
            message: 'Wallets table created successfully',
        });
    } catch (error) {
        console.error('Error creating wallets table:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create wallets table',
            },
            { status: 500 }
        );
    }
}
