import { query } from '@/lib/db';

const RPC_URL = 'https://testnet.sapphire.oasis.io';

type Input = { tokenId: number; currentPrice?: string | number | null };

export async function calculateAndStoreTokenMetrics({ tokenId, currentPrice }: Input) {
  const tokenResult = await query('SELECT * FROM tokens WHERE id = $1', [tokenId]);
  if (tokenResult.rows.length === 0) throw new Error('Token not found');
  const token = tokenResult.rows[0];

  // ── Giá hiện tại — lấy từ chain (getCurrentPrice) ───────────────────
  const latestTradeResult = await query(
    `SELECT price_per_token FROM purchases
     WHERE token_id = $1 AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
    [tokenId]
  );
  const latestTradePrice = latestTradeResult.rows[0]?.price_per_token
    ? parseFloat(latestTradeResult.rows[0].price_per_token) : null;

  let price = currentPrice ? parseFloat(String(currentPrice)) : 0;
  let totalSupply = parseFloat(token.total_supply) || 0;

  // Luôn lấy getCurrentPrice() từ chain — đây là giá thật
  if (token.contract_address) {
    try {
      const [pr, sr] = await Promise.all([
        fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc:'2.0', method:'eth_call', params:[{ to: token.contract_address, data:'0xeb91d37e' },'latest'], id:1 }) }),
        fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc:'2.0', method:'eth_call', params:[{ to: token.contract_address, data:'0x18160ddd' },'latest'], id:2 }) }),
      ]);
      const pd = await pr.json(); const sd = await sr.json();
      if (pd?.result && pd.result !== '0x') price = parseInt(pd.result, 16) / 1e18;
      if (sd?.result && sd.result !== '0x') totalSupply = parseInt(sd.result, 16) / 1e18;
    } catch { /* silent */ }
  }

  // Fallback nếu chain không trả về
  if (price === 0) price = latestTradePrice ?? parseFloat(token.price_snapshot_value || '0.05');

  // ── Marketcap ─────────────────────────────────────────────────────────
  const marketcap = price * totalSupply;

  // ── Volume 24h ────────────────────────────────────────────────────────
  const volRes = await query(
    `SELECT COALESCE(SUM(COALESCE(quantity, CASE WHEN price_per_token = 0 THEN 0 ELSE total_price / price_per_token END)), 0) AS vol
     FROM purchases WHERE token_id = $1 AND status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours'`,
    [tokenId]
  );
  const volume_24h = parseFloat(volRes.rows[0].vol) || 0;

  // ── Trader count (net positive holders) ───────────────────────────────
  const traderRes = await query(
    `SELECT COUNT(*) AS cnt FROM (
       SELECT address FROM (
         SELECT buyer_address AS address, SUM(quantity::numeric) AS net FROM purchases
         WHERE token_id = $1 AND buyer_address IS NOT NULL AND status = 'completed' GROUP BY buyer_address
         UNION ALL
         SELECT seller_address, -SUM(quantity::numeric) FROM purchases
         WHERE token_id = $1 AND seller_address IS NOT NULL AND status = 'completed' GROUP BY seller_address
       ) t GROUP BY address HAVING SUM(net) > 0
     ) h`,
    [tokenId]
  );
  const trader_count = parseInt(traderRes.rows[0].cnt) || 0;

  // ── Price changes: window-based (giống pump.fun) ──────────────────────
  // Giá tại mốc X phút trước = giao dịch cuối cùng có created_at <= NOW() - X phút
  // Nếu không có → dùng price_snapshot_value (giá khởi tạo)
  const getPriceAtWindow = async (minutes: number): Promise<number | null> => {
    const r = await query(
      `SELECT price_per_token FROM purchases
       WHERE token_id = $1 AND status = 'completed'
         AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
       ORDER BY created_at DESC LIMIT 1`,
      [tokenId, minutes]
    );
    if (r.rows.length > 0) return parseFloat(r.rows[0].price_per_token);
    // Fallback: giá khởi tạo của token
    const initPrice = parseFloat(token.price_snapshot_value || '0');
    return initPrice > 0 ? initPrice : null;
  };

  const calcChange = (past: number | null) =>
    past && past > 0 ? ((price - past) / past) * 100 : 0;

  let price_change_5m = 0, price_change_1h = 0, price_change_6h = 0;

  if (latestTradePrice !== null && price > 0) {
    try {
      const [p5m, p1h, p6h] = await Promise.all([
        getPriceAtWindow(5),
        getPriceAtWindow(60),
        getPriceAtWindow(360),
      ]);
      price_change_5m = calcChange(p5m);
      price_change_1h = calcChange(p1h);
      price_change_6h = calcChange(p6h);
    } catch (e) {
      console.warn('Warning calculating price changes:', e);
    }
  }

  // ── Update DB ─────────────────────────────────────────────────────────
  const updateResult = await query(
    `UPDATE tokens SET
       marketcap = $2,
       volume_24h = $3,
       price_change_5m = $4,
       price_change_1h = $5,
       price_change_6h = $6,
       trader_count = $7,
       price_snapshot_value = $8,
       price_snapshot_time = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      tokenId,
      marketcap,
      volume_24h,
      parseFloat(price_change_5m.toFixed(4)),
      parseFloat(price_change_1h.toFixed(4)),
      parseFloat(price_change_6h.toFixed(4)),
      trader_count,
      price,
    ]
  );

  return updateResult.rows[0];
}
