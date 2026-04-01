import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const result = await query(
            `SELECT t.*, tok.name, tok.symbol 
       FROM transactions t 
       LEFT JOIN tokens tok ON t.token_id = tok.id 
       WHERE t.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Transaction not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch transaction',
            },
            { status: 500 }
        );
    }
}
