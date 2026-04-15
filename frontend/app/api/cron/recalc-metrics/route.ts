import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateAndStoreTokenMetrics } from '@/lib/token-metrics';

export const dynamic = 'force-dynamic';

// GET /api/cron/recalc-metrics
// Recalculate metrics for all active tokens (called periodically)
export async function GET(request: NextRequest) {
    try {
        // Lấy tất cả tokens có giao dịch trong 7 ngày qua
        const result = await query(
            `SELECT DISTINCT t.id FROM tokens t
             INNER JOIN purchases p ON p.token_id = t.id
             WHERE p.created_at >= NOW() - INTERVAL '7 days'
               AND p.status = 'completed'`,
            []
        );

        const tokenIds = result.rows.map((r: any) => r.id);
        let updated = 0;

        for (const tokenId of tokenIds) {
            try {
                await calculateAndStoreTokenMetrics({ tokenId });
                updated++;
            } catch { /* silent per token */ }
        }

        return NextResponse.json({ success: true, updated, total: tokenIds.length });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
