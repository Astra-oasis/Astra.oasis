/**
 * Next.js Instrumentation — chạy khi server start
 * Setup background job recalculate price_change metrics mỗi 5 phút
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { calculateAndStoreTokenMetrics } = await import('@/lib/token-metrics');
    const { query } = await import('@/lib/db');

    const recalcAll = async () => {
      try {
        const result = await query(
          `SELECT DISTINCT token_id FROM price_snapshots
           WHERE recorded_at >= NOW() - INTERVAL '7 days'`,
          []
        );
        for (const row of result.rows) {
          try {
            await calculateAndStoreTokenMetrics({ tokenId: row.token_id });
          } catch { /* silent per token */ }
        }
      } catch { /* silent */ }
    };

    // Chạy mỗi 5 phút — đủ để sliding window 5m/1h/6h tự reset
    setInterval(recalcAll, 5 * 60 * 1000);

    // Chạy lần đầu sau 30s khi server start
    setTimeout(recalcAll, 30_000);
  }
}
