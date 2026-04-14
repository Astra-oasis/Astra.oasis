import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateAndStoreTokenMetrics } from '@/lib/token-metrics';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token_id, token_address, current_price } = body;

        if (!token_id && !token_address) {
            return NextResponse.json(
                { error: 'Either token_id or token_address is required' },
                { status: 400 }
            );
        }

        let tokenId = token_id;

        // Get token_id from contract_address if not provided
        if (!tokenId && token_address) {
            const tokenResult = await query(
                'SELECT id FROM tokens WHERE contract_address = $1 LIMIT 1',
                [token_address]
            );

            if (tokenResult.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Token not found' },
                    { status: 404 }
                );
            }

            tokenId = tokenResult.rows[0].id;
        }

        const updateResult = await calculateAndStoreTokenMetrics({
            tokenId,
            currentPrice: current_price,
        });

        return NextResponse.json({
            success: true,
            data: updateResult.rows[0]
        });
    } catch (error) {
        console.error('Error calculating token metrics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to calculate token metrics',
            },
            { status: 500 }
        );
    }
}
