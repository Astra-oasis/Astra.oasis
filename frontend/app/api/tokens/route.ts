import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, symbol, description, image_url, social_link, totalSupply, owner, contractAddress } = body;

        if (!name || !symbol || !owner || !contractAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: name, symbol, owner, contractAddress' },
                { status: 400 }
            );
        }

        const INITIAL_PRICE = 0.05;
        const supply = parseFloat(String(totalSupply || 0));
        const initialMarketcap = INITIAL_PRICE * supply;

        const result = await query(
            `INSERT INTO tokens (name, symbol, description, image_url, social_link, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time,
             marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h, trader_count,
             created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 0, 0, 0, 0, 0, NOW() + INTERVAL '7 hours')
       RETURNING *`,
            [name, symbol, description || null, image_url || null, social_link || null,
             supply, owner, contractAddress, INITIAL_PRICE, initialMarketcap]
        );

        return NextResponse.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating token:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create token',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const owner = request.nextUrl.searchParams.get('owner');

        let sql = `
            SELECT
                t.*,
                COALESCE(bp.max_reserve, 0) AS max_reserve,
                COALESCE(NULLIF(t.volume_24h, 0), pm.volume_24h_calc, 0) AS computed_volume_24h,
                COALESCE(pm.trader_count_calc, t.trader_count, 0) AS computed_trader_count,
                lt.last_trade_type
            FROM tokens t
            LEFT JOIN token_bonding_progress bp ON bp.token_id = t.id
            LEFT JOIN LATERAL (
                SELECT
                    COALESCE(
                        SUM(
                            COALESCE(
                                quantity,
                                CASE
                                    WHEN price_per_token IS NULL OR price_per_token = 0 THEN 0
                                    ELSE total_price / price_per_token
                                END
                            )
                        ),
                        0
                    ) AS volume_24h_calc,
                                        COALESCE((
                                                SELECT COUNT(*)
                                                FROM (
                                                        SELECT address
                                                        FROM (
                                                                SELECT buyer_address AS address, SUM(quantity::numeric) AS net_qty
                                                                FROM purchases
                                                                WHERE token_id = t.id
                                                                    AND buyer_address IS NOT NULL
                                                                    AND status = 'completed'
                                                                GROUP BY buyer_address

                                                                UNION ALL

                                                                SELECT seller_address AS address, -SUM(quantity::numeric) AS net_qty
                                                                FROM purchases
                                                                WHERE token_id = t.id
                                                                    AND seller_address IS NOT NULL
                                                                    AND status = 'completed'
                                                                GROUP BY seller_address
                                                        ) net_moves
                                                        GROUP BY address
                                                        HAVING SUM(net_qty) > 0
                                                ) holder_wallets
                                        ), 0) AS trader_count_calc
                FROM purchases p
                WHERE p.token_id = t.id
                  AND p.status = 'completed'
                  AND p.created_at >= NOW() - INTERVAL '24 hours'
            ) pm ON true
            LEFT JOIN LATERAL (
                SELECT CASE WHEN buyer_address IS NOT NULL THEN 'buy' ELSE 'sell' END AS last_trade_type
                FROM purchases
                WHERE token_id = t.id AND status = 'completed'
                ORDER BY created_at DESC
                LIMIT 1
            ) lt ON true
            ORDER BY t.created_at DESC
        `;
        const params: any[] = [];

        if (owner) {
            sql = `
                SELECT
                    t.*,
                    COALESCE(bp.max_reserve, 0) AS max_reserve,
                    COALESCE(NULLIF(t.volume_24h, 0), pm.volume_24h_calc, 0) AS computed_volume_24h,
                    COALESCE(pm.trader_count_calc, t.trader_count, 0) AS computed_trader_count,
                    lt.last_trade_type
                FROM tokens t
                LEFT JOIN token_bonding_progress bp ON bp.token_id = t.id
                LEFT JOIN LATERAL (
                    SELECT
                        COALESCE(
                            SUM(
                                COALESCE(
                                    quantity,
                                    CASE
                                        WHEN price_per_token IS NULL OR price_per_token = 0 THEN 0
                                        ELSE total_price / price_per_token
                                    END
                                )
                            ),
                            0
                        ) AS volume_24h_calc,
                                                COALESCE((
                                                        SELECT COUNT(*)
                                                        FROM (
                                                                SELECT address
                                                                FROM (
                                                                        SELECT buyer_address AS address, SUM(quantity::numeric) AS net_qty
                                                                        FROM purchases
                                                                        WHERE token_id = t.id
                                                                            AND buyer_address IS NOT NULL
                                                                            AND status = 'completed'
                                                                        GROUP BY buyer_address

                                                                        UNION ALL

                                                                        SELECT seller_address AS address, -SUM(quantity::numeric) AS net_qty
                                                                        FROM purchases
                                                                        WHERE token_id = t.id
                                                                            AND seller_address IS NOT NULL
                                                                            AND status = 'completed'
                                                                        GROUP BY seller_address
                                                                ) net_moves
                                                                GROUP BY address
                                                                HAVING SUM(net_qty) > 0
                                                        ) holder_wallets
                                                ), 0) AS trader_count_calc
                    FROM purchases p
                    WHERE p.token_id = t.id
                      AND p.status = 'completed'
                      AND p.created_at >= NOW() - INTERVAL '24 hours'
                ) pm ON true
                LEFT JOIN LATERAL (
                    SELECT CASE WHEN buyer_address IS NOT NULL THEN 'buy' ELSE 'sell' END AS last_trade_type
                    FROM purchases
                    WHERE token_id = t.id AND status = 'completed'
                    ORDER BY created_at DESC
                    LIMIT 1
                ) lt ON true
                WHERE t.owner = $1
                ORDER BY t.created_at DESC
            `;
            params.push(owner);
        }

        const result = await query(sql, params.length > 0 ? params : undefined);

        const response = NextResponse.json({
            success: true,
            data: result.rows,
        });

        return response;
    } catch (error) {
        console.error('Error fetching tokens:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch tokens',
            },
            { status: 500 }
        );
    }
}