/**
 * Test script: kiểm tra DB flow từ tạo token → mua bán → metrics
 * Run: node scripts/test-db-flow.mjs
 */

import pg from 'pg';

const { Client } = pg;

const DB_URL = 'postgresql://neondb_owner:npg_S7otbmnGgs6T@ep-shy-band-a1jo43cn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DB_URL });

const log = (label, data) => {
    console.log(`\n✅ ${label}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

const err = (label, e) => console.error(`\n❌ ${label}:`, e.message);

async function run() {
    await client.connect();
    console.log('🔌 Connected to DB\n');

    // ── 1. Tạo token test ──────────────────────────────────────────────────
    const contractAddr = `0xTEST_${Date.now()}`;
    const insertToken = await client.query(
        `INSERT INTO tokens
            (name, symbol, description, image_url, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time,
             marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h,
             trader_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, $8, NOW(), 0, 0, 0, 0, 0, 0, NOW())
         RETURNING id, name, symbol, total_supply, price_snapshot_value, price_snapshot_time,
                   marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h`,
        [
            'TestToken', 'TTK', 'Test token for DB flow',
            'https://example.com/img.png',
            1_000_000_000,          // 1 tỷ supply
            '0xOwner123',
            contractAddr,
            0,                      // price_snapshot_value khởi tạo = 0
        ]
    );
    const token = insertToken.rows[0];
    log('Token created', token);

    // Kiểm tra price_snapshot_value và time có tồn tại không
    if (token.price_snapshot_value === null || token.price_snapshot_time === null) {
        err('FAIL', new Error('price_snapshot_value hoặc price_snapshot_time bị NULL khi tạo token!'));
    } else {
        log('price_snapshot fields OK', {
            value: token.price_snapshot_value,
            time: token.price_snapshot_time,
        });
    }

    const tokenId = token.id;

    // ── 2. Simulate BUY ────────────────────────────────────────────────────
    const buyPrice = 0.00005;
    const buyQty = 5000;
    const buyTotal = buyPrice * buyQty;

    await client.query(
        `INSERT INTO purchases
            (token_id, buyer_address, quantity, price_per_token, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
        [tokenId, '0xBuyer001', buyQty, buyPrice, buyTotal]
    );
    log('BUY inserted', { qty: buyQty, price: buyPrice, total: buyTotal });

    // ── 3. Tính metrics sau BUY ────────────────────────────────────────────
    await recalcMetrics(client, tokenId, buyPrice, 1_000_000_000);

    // ── 4. Simulate SELL (sau 1 giây) ─────────────────────────────────────
    await sleep(1000);
    const sellPrice = 0.000048; // giá giảm nhẹ
    const sellQty = 1000;
    const sellTotal = sellPrice * sellQty;

    await client.query(
        `INSERT INTO purchases
            (token_id, seller_address, quantity, price_per_token, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW())`,
        [tokenId, '0xSeller001', sellQty, sellPrice, sellTotal]
    );
    log('SELL inserted', { qty: sellQty, price: sellPrice, total: sellTotal });

    // ── 5. Tính metrics sau SELL ───────────────────────────────────────────
    await recalcMetrics(client, tokenId, sellPrice, 1_000_000_000);

    // ── 6. Đọc lại token từ DB để verify ──────────────────────────────────
    const final = await client.query(
        `SELECT id, name, marketcap, volume_24h,
                price_change_5m, price_change_1h, price_change_6h,
                price_snapshot_value, price_snapshot_time, trader_count
         FROM tokens WHERE id = $1`,
        [tokenId]
    );
    log('Final token state in DB', final.rows[0]);

    // ── 7. Verify từng field ───────────────────────────────────────────────
    const t = final.rows[0];
    const checks = [
        ['marketcap > 0',          parseFloat(t.marketcap) > 0],
        ['volume_24h > 0',         parseFloat(t.volume_24h) > 0],
        ['price_snapshot_value > 0', parseFloat(t.price_snapshot_value) > 0],
        ['price_snapshot_time set', t.price_snapshot_time !== null],
        ['trader_count > 0',       parseInt(t.trader_count) > 0],
    ];

    console.log('\n── Verification ──────────────────────────────');
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✅' : '❌'} ${label}`);
    }

    // ── 8. Cleanup ─────────────────────────────────────────────────────────
    await client.query('DELETE FROM purchases WHERE token_id = $1', [tokenId]);
    await client.query('DELETE FROM tokens WHERE id = $1', [tokenId]);
    log('Cleanup done — test token removed');

    await client.end();
    console.log('\n🏁 Test complete\n');
}

async function recalcMetrics(client, tokenId, currentPrice, totalSupply) {
    const marketcap = currentPrice * totalSupply;

    // Volume 24h
    const volRes = await client.query(
        `SELECT COALESCE(SUM(quantity::numeric), 0) AS vol
         FROM purchases
         WHERE token_id = $1 AND status = 'completed'
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [tokenId]
    );
    const volume_24h = parseFloat(volRes.rows[0].vol);

    // Trader count (net positive holders)
    const traderRes = await client.query(
        `SELECT COUNT(*) AS cnt FROM (
            SELECT address FROM (
                SELECT buyer_address AS address, SUM(quantity::numeric) AS net
                FROM purchases WHERE token_id = $1 AND buyer_address IS NOT NULL AND status = 'completed'
                GROUP BY buyer_address
                UNION ALL
                SELECT seller_address, -SUM(quantity::numeric)
                FROM purchases WHERE token_id = $1 AND seller_address IS NOT NULL AND status = 'completed'
                GROUP BY seller_address
            ) t GROUP BY address HAVING SUM(net) > 0
         ) h`,
        [tokenId]
    );
    const trader_count = parseInt(traderRes.rows[0].cnt);

    // Price changes — so sánh với giá tại các mốc thời gian
    const getPastPrice = async (minutes) => {
        const r = await client.query(
            `SELECT price_per_token FROM purchases
             WHERE token_id = $1 AND status = 'completed'
               AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
             ORDER BY created_at DESC LIMIT 1`,
            [tokenId, minutes]
        );
        return r.rows[0] ? parseFloat(r.rows[0].price_per_token) : null;
    };

    const calcChange = (past) => past && past > 0 ? ((currentPrice - past) / past) * 100 : 0;

    const [p5m, p1h, p6h] = await Promise.all([
        getPastPrice(5), getPastPrice(60), getPastPrice(360)
    ]);

    const price_change_5m = calcChange(p5m);
    const price_change_1h = calcChange(p1h);
    const price_change_6h = calcChange(p6h);

    await client.query(
        `UPDATE tokens SET
            marketcap = $2, volume_24h = $3,
            price_change_5m = $4, price_change_1h = $5, price_change_6h = $6,
            trader_count = $7,
            price_snapshot_value = $8, price_snapshot_time = NOW(),
            updated_at = NOW()
         WHERE id = $1`,
        [tokenId, marketcap, volume_24h,
         price_change_5m.toFixed(4), price_change_1h.toFixed(4), price_change_6h.toFixed(4),
         trader_count, currentPrice]
    );

    log(`Metrics recalculated`, {
        marketcap, volume_24h, trader_count,
        price_change_5m: price_change_5m.toFixed(4),
        price_change_1h: price_change_1h.toFixed(4),
        price_change_6h: price_change_6h.toFixed(4),
        price_snapshot_value: currentPrice,
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
