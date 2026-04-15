import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // Delete all tokens
        await query('DELETE FROM tokens');
        
        // Delete all purchases
        await query('DELETE FROM purchases');

        // Reset sequences
        await query('ALTER SEQUENCE tokens_id_seq RESTART WITH 1');
        await query('ALTER SEQUENCE purchases_id_seq RESTART WITH 1');

        return NextResponse.json({
            success: true,
            message: 'Database cleared successfully',
        });
    } catch (error) {
        console.error('Error clearing database:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear database',
            },
            { status: 500 }
        );
    }
}
