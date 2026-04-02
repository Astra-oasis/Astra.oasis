import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const result = await query(
            `SELECT
                p.id,
                p.token_id,
                p.buyer_address,
                p.seller_address,
                p.is_private,
                p.visibility_source,
                p.price_per_token,
                p.total_price,
                p.transaction_hash,
                p.status,
                p.created_at,
                p.updated_at,
                t.name,
                t.symbol
       
       FROM purchases p 
       LEFT JOIN tokens t ON p.token_id = t.id 
       WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Purchase not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch purchase',
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json(
                { error: 'Missing required field: status' },
                { status: 400 }
            );
        }

        const result = await query(
            `UPDATE purchases 
       SET status = $1, updated_at = NOW() + INTERVAL '7 hours'
       WHERE id = $2
       RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Purchase not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update purchase',
            },
            { status: 500 }
        );
    }
}
