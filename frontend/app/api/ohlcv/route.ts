import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const tokenId = request.nextUrl.searchParams.get('tokenId');
        const interval = request.nextUrl.searchParams.get('interval') || '5m';

        if (!tokenId) {
            return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 });
        }

        // Map interval to seconds for grouping
        const intervalSeconds: Record<string, number> = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
        };
        const secs = intervalSeconds[interval] ?? 300;

        // Group purchases into OHLCV candles using epoch bucketing
        const result = await query(
            `SELECT
                (FLOOR(EXTRACT(EPOCH FROM created_at) / $2) * $2)::bigint AS bucket,
                (array_agg(price_per_token::float ORDER BY created_at ASC))[1]  AS open,
                MAX(price_per_token::float)                                      AS high,
                MIN(price_per_token::float)                                      AS low,
                (array_agg(price_per_token::float ORDER BY created_at DESC))[1] AS close,
                SUM(quantity::float)                                             AS volume
             FROM purchases
             WHERE token_id = $1
               AND price_per_token IS NOT NULL
               AND price_per_token::float > 0
             GROUP BY bucket
             ORDER BY bucket ASC`,
            [tokenId, secs]
        );

        const candles = result.rows.map((row: any) => ({
            time: parseInt(row.bucket),
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume),
        }));

        return NextResponse.json({ success: true, data: candles });
    } catch (error) {
        console.error('Error fetching OHLCV:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
