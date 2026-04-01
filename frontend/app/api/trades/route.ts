import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('tokenId');

        if (!tokenId) {
            return NextResponse.json(
                { error: 'Missing tokenId parameter' },
                { status: 400 }
            );
        }

        const result = await query(
                        `SELECT
                                id,
                                token_id,
                                buyer_address,
                                seller_address,
                                CASE WHEN buyer_address IS NOT NULL THEN 'buy' ELSE 'sell' END AS trade_type,
                                price_per_token,
                                total_price,
                                created_at,
                                transaction_hash
                         FROM purchases
                         WHERE token_id = $1
                             AND status = 'completed'
                         ORDER BY created_at DESC
                         LIMIT 50`,
            [tokenId]
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching trades:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch trades',
            },
            { status: 500 }
        );
    }
}
