import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const result = await query('SELECT NOW()');
        return NextResponse.json({
            success: true,
            message: 'Database connection successful',
            timestamp: result.rows[0],
        });
    } catch (error) {
        console.error('Database connection error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Database connection failed',
            },
            { status: 500 }
        );
    }
}
