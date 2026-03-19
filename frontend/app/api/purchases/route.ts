import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            token_id,
            buyer_address,
            seller_address,
            quantity,
            price_per_token,
            total_price,
            transaction_hash,
            status,
        } = body;

        if (!token_id || !buyer_address || !quantity || !price_per_token || !total_price) {
            return NextResponse.json(
                {
                    error:
                        'Missing required fields: token_id, buyer_address, quantity, price_per_token, total_price',
                },
                { status: 400 }
            );
        }

        const result = await query(
            `INSERT INTO purchases (token_id, buyer_address, seller_address, quantity, price_per_token, total_price, transaction_hash, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
            [
                token_id,
                buyer_address,
                seller_address || null,
                quantity,
                price_per_token,
                total_price,
                transaction_hash || null,
                status || 'completed',
            ]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create purchase',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('token_id');
        const buyerAddress = request.nextUrl.searchParams.get('buyer_address');
        const sellerAddress = request.nextUrl.searchParams.get('seller_address');
        const status = request.nextUrl.searchParams.get('status');

        const params: any[] = [];
        const conditions: string[] = [];

        if (tokenId) {
            conditions.push(`token_id = $${conditions.length + 1}`);
            params.push(parseInt(tokenId));
        }

        if (buyerAddress) {
            conditions.push(`buyer_address = $${conditions.length + 1}`);
            params.push(buyerAddress);
        }

        if (sellerAddress) {
            conditions.push(`seller_address = $${conditions.length + 1}`);
            params.push(sellerAddress);
        }

        if (status) {
            conditions.push(`status = $${conditions.length + 1}`);
            params.push(status);
        }

        let sql = `SELECT p.*, t.name, t.symbol FROM purchases p
               LEFT JOIN tokens t ON p.token_id = t.id`;

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY p.created_at DESC';

        const result = await query(sql, params.length > 0 ? params : undefined);

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch purchases',
            },
            { status: 500 }
        );
    }
}
