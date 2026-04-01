import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Test database connection
        const result = await query('SELECT NOW()');
        
        // Get token count
        const tokenCount = await query('SELECT COUNT(*) FROM tokens');
        
        // Get purchase count
        const purchaseCount = await query('SELECT COUNT(*) FROM purchases');

        return NextResponse.json({
            success: true,
            message: 'Database connection successful',
            timestamp: result.rows[0].now,
            stats: {
                tokens: tokenCount.rows[0].count,
                purchases: purchaseCount.rows[0].count,
            }
        });
    } catch (error) {
        console.error('Error testing database:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to connect to database',
            },
            { status: 500 }
        );
    }
}
