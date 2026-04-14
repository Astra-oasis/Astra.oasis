import { query } from '@/lib/db';

const RPC_URL = 'https://testnet.sapphire.oasis.io';

type CalculateTokenMetricsInput = {
  tokenId: number;
  currentPrice?: string | number | null;
};

export async function calculateAndStoreTokenMetrics({ tokenId, currentPrice }: CalculateTokenMetricsInput) {
  const tokenResult = await query('SELECT * FROM tokens WHERE id = $1', [tokenId]);

  if (tokenResult.rows.length === 0) {
    throw new Error('Token not found');
  }

  const token = tokenResult.rows[0];
  const latestTradeResult = await query(
    `SELECT created_at, price_per_token
     FROM purchases
     WHERE token_id = $1
       AND status = 'completed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenId]
  );

  const latestTrade = latestTradeResult.rows[0] ?? null;
  const latestTradePrice = latestTrade?.price_per_token ? parseFloat(latestTrade.price_per_token) : null;

  let price = currentPrice ? parseFloat(String(currentPrice)) : (latestTradePrice ?? 0);
  let totalSupply = parseFloat(token.total_supply) || 0;

  if (token.contract_address && !currentPrice && (latestTradePrice === null || !Number.isFinite(latestTradePrice))) {
    try {
      const getPriceCall = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: token.contract_address, data: '0x79cc6790' }, 'latest'],
        id: 1,
      };

      const getTotalSupplyCall = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: token.contract_address, data: '0x18160ddd' }, 'latest'],
        id: 2,
      };

      const [priceResponse, supplyResponse] = await Promise.all([
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getPriceCall),
        }),
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getTotalSupplyCall),
        }),
      ]);

      const priceData = await priceResponse.json();
      const supplyData = await supplyResponse.json();

      if (priceData?.result && supplyData?.result) {
        price = parseInt(priceData.result, 16) / 1e18;
        totalSupply = parseInt(supplyData.result, 16) / 1e18;
      } else {
        price = parseFloat(token.price_snapshot_value || '0');
        totalSupply = parseFloat(token.total_supply) || 0;
      }
    } catch (error) {
      console.warn('Error fetching from smart contract RPC:', error);
      price = parseFloat(token.price_snapshot_value || '0');
      totalSupply = parseFloat(token.total_supply) || 0;
    }
  }

  const marketcap = price * totalSupply;

  const volume24hResult = await query(
    `SELECT COALESCE(
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
      ) AS volume
     FROM purchases
     WHERE token_id = $1
       AND status = 'completed'
       AND created_at >= NOW() - INTERVAL '24 hours'`,
    [tokenId]
  );
  const volume_24h = parseFloat(volume24hResult.rows[0].volume) || 0;

  const traderCountResult = await query(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT address
       FROM (
         SELECT buyer_address AS address, SUM(quantity::numeric) AS net_qty
         FROM purchases
         WHERE token_id = $1
           AND buyer_address IS NOT NULL
           AND status = 'completed'
         GROUP BY buyer_address

         UNION ALL

         SELECT seller_address AS address, -SUM(quantity::numeric) AS net_qty
         FROM purchases
         WHERE token_id = $1
           AND seller_address IS NOT NULL
           AND status = 'completed'
         GROUP BY seller_address
       ) net_moves
       GROUP BY address
       HAVING SUM(net_qty) > 0
     ) holder_wallets`,
    [tokenId]
  );
  const trader_count = parseInt(traderCountResult.rows[0].count) || 0;

  let price_change_5m = parseFloat(token.price_change_5m) || 0;
  let price_change_1h = parseFloat(token.price_change_1h) || 0;
  let price_change_4h = parseFloat(token.price_change_4h) || 0;
  let price_change_6h = parseFloat(token.price_change_6h) || 0;

  try {
    const snapshotTime = token.price_snapshot_time ? new Date(token.price_snapshot_time) : null;

    if (!latestTrade) {
      price_change_5m = 0;
      price_change_1h = 0;
      price_change_4h = 0;
      price_change_6h = 0;
    } else {
      const latestTradeTime = new Date(latestTrade.created_at);
      const hasNewTrade = !snapshotTime || latestTradeTime.getTime() > snapshotTime.getTime();

      const getPriceAtTimepoint = async (intervalMinutes: number) => {
        const result = await query(
          `SELECT price_per_token AS past_price
           FROM purchases
           WHERE token_id = $1
             AND status = 'completed'
             AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
           ORDER BY created_at DESC
           LIMIT 1`,
          [tokenId, intervalMinutes]
        );

        if (result.rows.length > 0 && result.rows[0].past_price) {
          return parseFloat(result.rows[0].past_price);
        }

        return latestTradePrice;
      };

      if (hasNewTrade) {
        const pastPrice5m = await getPriceAtTimepoint(5);
        const pastPrice1h = await getPriceAtTimepoint(60);
        const pastPrice4h = await getPriceAtTimepoint(240);
        const pastPrice6h = await getPriceAtTimepoint(360);

        if (pastPrice5m && pastPrice5m > 0) price_change_5m = ((price - pastPrice5m) / pastPrice5m) * 100;
        if (pastPrice1h && pastPrice1h > 0) price_change_1h = ((price - pastPrice1h) / pastPrice1h) * 100;
        if (pastPrice4h && pastPrice4h > 0) price_change_4h = ((price - pastPrice4h) / pastPrice4h) * 100;
        if (pastPrice6h && pastPrice6h > 0) price_change_6h = ((price - pastPrice6h) / pastPrice6h) * 100;
      } else {
        const ageMs = Date.now() - latestTradeTime.getTime();
        if (ageMs >= 5 * 60 * 1000) price_change_5m = 0;
        if (ageMs >= 4 * 60 * 60 * 1000) price_change_4h = 0;
        if (ageMs >= 6 * 60 * 60 * 1000) price_change_6h = 0;
      }
    }
  } catch (error) {
    console.warn('Warning calculating price changes:', error);
  }

  const updateResult = await query(
    `UPDATE tokens
     SET marketcap = $2,
         volume_24h = $3,
         price_change_5m = $4,
         price_change_1h = $5,
         price_change_4h = $6,
         price_change_6h = $7,
         trader_count = $8,
         price_snapshot_value = $9,
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
      parseFloat(price_change_4h.toFixed(4)),
      parseFloat(price_change_6h.toFixed(4)),
      trader_count,
      price,
    ]
  );

  return updateResult.rows[0];
}