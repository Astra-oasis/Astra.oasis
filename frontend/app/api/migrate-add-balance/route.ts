import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Add test_balance column to wallets table
        await query(`
            ALTER TABLE wallets 
            ADD COLUMN IF NOT EXISTS test_balance NUMERIC(36, 18) DEFAULT 0
        `);

        return NextResponse.json({
            success: true,
            message: 'Wallets table updated with test_balance column',
        });
    } catch (error) {
        console.error('Error updating wallets table:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update wallets table',
            },
            { status: 500 }
        );
    }
}
