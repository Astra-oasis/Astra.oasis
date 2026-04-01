import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            token_id,
            token_address,
            marketcap,
            volume_24h,
            price_change_5m,
            price_change_1h,
            price_change_6h,
            trader_count,
            current_price,
        } = body;

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

        // Update tokens table with market metrics
        const result = await query(
            `UPDATE tokens 
             SET marketcap = COALESCE($2, marketcap),
                 volume_24h = COALESCE($3, volume_24h),
                 price_change_5m = COALESCE($4, price_change_5m),
                 price_change_1h = COALESCE($5, price_change_1h),
                 price_change_6h = COALESCE($6, price_change_6h),
                 trader_count = COALESCE($7, trader_count),
                 price_snapshot_value = COALESCE($8, price_snapshot_value),
                 price_snapshot_time = NOW(),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [
                tokenId,
                marketcap !== undefined ? marketcap : null,
                volume_24h !== undefined ? volume_24h : null,
                price_change_5m !== undefined ? price_change_5m : null,
                price_change_1h !== undefined ? price_change_1h : null,
                price_change_6h !== undefined ? price_change_6h : null,
                trader_count !== undefined ? trader_count : null,
                current_price !== undefined ? current_price : null,
            ]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating token metrics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update token metrics',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('token_id');
        const tokenAddress = request.nextUrl.searchParams.get('token_address');

        if (!tokenId && !tokenAddress) {
            return NextResponse.json(
                { error: 'Either token_id or token_address is required' },
                { status: 400 }
            );
        }

        let query_sql = 'SELECT * FROM tokens WHERE ';
        let params: (string | number | null)[] = [];

        if (tokenId) {
            query_sql += 'id = $1';
            params = [parseInt(tokenId)];
        } else {
            query_sql += 'contract_address = $1';
            params = [tokenAddress];
        }

        const result = await query(query_sql + ' LIMIT 1', params);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Token not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching token metrics:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch token metrics',
            },
            { status: 500 }
        );
    }
}
