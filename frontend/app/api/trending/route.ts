import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/trending?limit=10&window=24h
// Score = (buy_count * 3) + (comment_count * 2) + (trade_count * 1)
export async function GET(request: NextRequest) {
    try {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
        const windowHours = parseInt(request.nextUrl.searchParams.get('window') || '24');

        const result = await query(
            `SELECT
                t.id,
                t.name,
                t.symbol,
                t.description,
                t.image_url,
                t.owner,
                t.contract_address,
                t.total_supply,
                t.marketcap,
                t.volume_24h,
                t.price_snapshot_value,
                COALESCE(hs.holder_count, t.trader_count, 0) AS trader_count,
                t.created_at,
                COALESCE(bp.max_reserve, 0) AS max_reserve,
                COALESCE(stats.buy_count, 0)     AS buy_count,
                COALESCE(stats.trade_count, 0)   AS trade_count,
                COALESCE(cmt.comment_count, 0)   AS comment_count,
                -- Trending score
                (COALESCE(stats.buy_count, 0) * 3
                 + COALESCE(cmt.comment_count, 0) * 2
                 + COALESCE(stats.trade_count, 0) * 1
                ) AS trend_score
             FROM tokens t
             LEFT JOIN token_bonding_progress bp ON bp.token_id = t.id
                         LEFT JOIN LATERAL (
                                 SELECT COUNT(*) AS holder_count
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
                         ) hs ON true
             LEFT JOIN LATERAL (
                 SELECT
                     COUNT(*) FILTER (WHERE buyer_address IS NOT NULL) AS buy_count,
                     COUNT(*)                                           AS trade_count
                 FROM purchases p
                 WHERE p.token_id = t.id
                   AND p.status = 'completed'
                   AND p.created_at >= NOW() - ($1 || ' hours')::INTERVAL
             ) stats ON true
             LEFT JOIN LATERAL (
                 SELECT COUNT(*) AS comment_count
                 FROM comments c
                 WHERE c.token_id = t.id
                   AND c.created_at >= NOW() - ($1 || ' hours')::INTERVAL
             ) cmt ON true
             ORDER BY trend_score DESC, t.created_at DESC
             LIMIT $2`,
            [windowHours, limit]
        );

        const tokens = result.rows.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            ticker: r.symbol,
            description: r.description || '',
            imageUrl: r.image_url || '',
            creator: r.owner,
            contractAddress: r.contract_address,
            marketCap: parseFloat(r.marketcap) || 0,
            volume24h: parseFloat(r.volume_24h) || 0,
            price: parseFloat(r.price_snapshot_value) || 0,
            traderCount: parseInt(r.trader_count) || 0,
            bondingCurveProgress: Math.min(100, (parseFloat(r.max_reserve) / 10000) * 100),
            createdAt: new Date(r.created_at).getTime(),
            trendScore: parseInt(r.trend_score) || 0,
            buyCount: parseInt(r.buy_count) || 0,
            commentCount: parseInt(r.comment_count) || 0,
        }));

        return NextResponse.json({ success: true, data: tokens });
    } catch (error) {
        console.error('Error fetching trending:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
