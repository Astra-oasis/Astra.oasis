import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Ensure table exists
async function ensureTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS token_bonding_progress (
            token_id   INTEGER PRIMARY KEY REFERENCES tokens(id) ON DELETE CASCADE,
            max_reserve NUMERIC(30, 18) NOT NULL DEFAULT 0,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// GET /api/bonding-progress?tokenId=123
export async function GET(request: NextRequest) {
    try {
        await ensureTable();
        const tokenId = request.nextUrl.searchParams.get('tokenId');
        if (!tokenId) {
            return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 });
        }

        const result = await query(
            `SELECT max_reserve FROM token_bonding_progress WHERE token_id = $1`,
            [tokenId]
        );

        const maxReserve = result.rows.length > 0 ? parseFloat(result.rows[0].max_reserve) : 0;
        const progress = Math.min(100, (maxReserve / 10000) * 100);

        return NextResponse.json({ success: true, data: { max_reserve: maxReserve, progress } });
    } catch (error) {
        console.error('Error fetching bonding progress:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}

// POST /api/bonding-progress  { token_id, amount_test }
// Only increases max_reserve — never decreases (buy-only progress)
export async function POST(request: NextRequest) {
    try {
        await ensureTable();
        const { token_id, amount_test } = await request.json();

        if (!token_id || amount_test === undefined) {
            return NextResponse.json({ error: 'Missing token_id or amount_test' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO token_bonding_progress (token_id, max_reserve, updated_at)
             VALUES ($1, GREATEST(0, $2::NUMERIC), NOW() + INTERVAL '7 hours')
             ON CONFLICT (token_id) DO UPDATE
               SET max_reserve = GREATEST(0, token_bonding_progress.max_reserve + $2::NUMERIC),
                   updated_at  = NOW() + INTERVAL '7 hours'
             RETURNING max_reserve`,
            [token_id, amount_test]
        );

        const maxReserve = parseFloat(result.rows[0].max_reserve);
        const progress = Math.min(100, (maxReserve / 10000) * 100);

        return NextResponse.json({ success: true, data: { max_reserve: maxReserve, progress } });
    } catch (error) {
        console.error('Error updating bonding progress:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 }
        );
    }
}
