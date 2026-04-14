/**
 * Test full metrics flow với timestamps thật
 * Simulate: giá tăng dần qua các mốc 6h → 1h → 5m → now
 * Run: node scripts/test-full-metrics.mjs
 */

import pg from 'pg';
const { Client } = pg;

const DB_URL = 'postgresql://neondb_owner:npg_S7otbmnGgs6T@ep-shy-band-a1jo43cn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString: DB_URL });

const TOTAL_SUPPLY = 1_000_000_000;
const CONTRACT_ADDR = `0xTEST_METRICS_${Date.now()}`;

// Giá tại các mốc — tăng dần để 5m/1h/6h đều dương
const PRICES = {
    '6h_ago':  0.000010,  // giá 6h trước
    '1h_ago':  0.000030,  // giá 1h trước
    '5m_ago':  0.000045,  // giá 5m trước
    'now':     0.000050,  // giá hiện tại
};

const log  = (l, d) => { console.log(`\n✅ ${l}`); if (d) console.log(JSON.stringify(d, null, 2)); };
const fail = (l, e) => { console.error(`\n❌ ${l}:`, e.message || e); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function insertPurchase(tokenId, price, qty, minsAgo, type = 'buy') {
    const total = price * qty;
    await client.query(
        `INSERT INTO purchases
            (token_id, buyer_address, seller_address, quantity, price_per_token, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'completed',
                 NOW() + INTERVAL '7 hours' - ($7 * INTERVAL '1 minute'))`,
        [
            tokenId,
            type === 'buy'  ? '0xBuyer001' : null,
            type === 'sell' ? '0xSeller001' : null,
            qty, price, total, minsAgo,
        ]
    );
    log(`${type.toUpperCase()} @ ${minsAgo}m ago`, { price, qty, total });
}

async function recalcMetrics(tokenId, currentPrice) {
    // Volume 24h
    const volRes = await client.query(
        `SELECT COALESCE(SUM(quantity::numeric), 0) AS vol
         FROM purchases
         WHERE token_id = $1 AND status = 'completed'
           AND created_at >= NOW() + INTERVAL '7 hours' - INTERVAL '24 hours'`,
        [tokenId]
    );
    const volume_24h = parseFloat(volRes.rows[0].vol);

    // Trader count
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

    // Price tại các mốc — lấy giá giao dịch gần nhất TRƯỚC mốc đó
    const getPastPrice = async (minutes) => {
        const r = await client.query(
            `SELECT price_per_token FROM purchases
             WHERE token_id = $1 AND status = 'completed'
               AND created_at <= NOW() + INTERVAL '7 hours' - ($2 * INTERVAL '1 minute')
             ORDER BY created_at DESC LIMIT 1`,
            [tokenId, minutes]
        );
        return r.rows[0] ? parseFloat(r.rows[0].price_per_token) : null;
    };

    const calcChange = (past) => past && past > 0
        ? (((currentPrice - past) / past) * 100).toFixed(4)
        : '0.0000';

    const [p5m, p1h, p6h] = await Promise.all([
        getPastPrice(5), getPastPrice(60), getPastPrice(360)
    ]);

    const price_change_5m = calcChange(p5m);
    const price_change_1h = calcChange(p1h);
    const price_change_6h = calcChange(p6h);
    const marketcap = currentPrice * TOTAL_SUPPLY;

    await client.query(
        `UPDATE tokens SET
            marketcap = $2, volume_24h = $3,
            price_change_5m = $4, price_change_1h = $5, price_change_6h = $6,
            trader_count = $7,
            price_snapshot_value = $8, price_snapshot_time = NOW(),
            updated_at = NOW()
         WHERE id = $1`,
        [tokenId, marketcap, volume_24h,
         price_change_5m, price_change_1h, price_change_6h,
         trader_count, currentPrice]
    );

    return { marketcap, volume_24h, trader_count,
             price_change_5m, price_change_1h, price_change_6h,
             past_prices: { p5m, p1h, p6h } };
}

async function run() {
    await client.connect();
    console.log('🔌 Connected\n');
    console.log('📋 Price timeline:');
    console.log(`   6h ago: ${PRICES['6h_ago']} → 1h ago: ${PRICES['1h_ago']} → 5m ago: ${PRICES['5m_ago']} → now: ${PRICES['now']}`);

    // ── 1. Tạo token ──────────────────────────────────────────────────────
    const res = await client.query(
        `INSERT INTO tokens
            (name, symbol, description, image_url, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time,
             marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h, trader_count,
             created_at)
         VALUES ('MetricsTest','MTK','Test','https://x.com/img.png',
                 $1,'0xOwner',$2, 0, NOW(), 0,0,0,0,0,0, NOW() + INTERVAL '7 hours' - INTERVAL '7 hours')
         RETURNING id`,
        [TOTAL_SUPPLY, CONTRACT_ADDR]
    );
    const tokenId = res.rows[0].id;
    log(`Token created (id=${tokenId})`);

    // ── 2. Insert purchases tại các mốc thời gian ─────────────────────────
    await insertPurchase(tokenId, PRICES['6h_ago'], 10000, 361, 'buy');   // 6h1m trước
    await insertPurchase(tokenId, PRICES['1h_ago'], 5000,  61,  'buy');   // 1h1m trước
    await insertPurchase(tokenId, PRICES['5m_ago'], 2000,  6,   'buy');   // 6m trước
    await insertPurchase(tokenId, PRICES['now'],    1000,  0,   'buy');   // hiện tại

    // ── 3. Tính metrics ───────────────────────────────────────────────────
    const metrics = await recalcMetrics(tokenId, PRICES['now']);
    log('Metrics after recalc', metrics);

    // ── 4. Đọc lại từ DB ──────────────────────────────────────────────────
    const final = await client.query(
        `SELECT marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h,
                price_snapshot_value, trader_count
         FROM tokens WHERE id = $1`,
        [tokenId]
    );
    log('DB state', final.rows[0]);

    // ── 5. Verify ─────────────────────────────────────────────────────────
    const t = final.rows[0];
    const p5m  = parseFloat(t.price_change_5m);
    const p1h  = parseFloat(t.price_change_1h);
    const p6h  = parseFloat(t.price_change_6h);
    const mc   = parseFloat(t.marketcap);
    const vol  = parseFloat(t.volume_24h);

    // Expected changes:
    // 5m:  (0.000050 - 0.000045) / 0.000045 * 100 = +11.11%
    // 1h:  (0.000050 - 0.000030) / 0.000030 * 100 = +66.67%
    // 6h:  (0.000050 - 0.000010) / 0.000010 * 100 = +400%
    const exp5m  = ((PRICES.now - PRICES['5m_ago'])  / PRICES['5m_ago']  * 100);
    const exp1h  = ((PRICES.now - PRICES['1h_ago'])  / PRICES['1h_ago']  * 100);
    const exp6h  = ((PRICES.now - PRICES['6h_ago'])  / PRICES['6h_ago']  * 100);
    const expMC  = PRICES.now * TOTAL_SUPPLY;
    const expVol = 10000 + 5000 + 2000 + 1000; // tổng qty

    console.log('\n── Verification ──────────────────────────────────────────');
    const check = (label, actual, expected, tolerance = 0.01) => {
        const pass = Math.abs(actual - expected) <= tolerance;
        console.log(`${pass ? '✅' : '❌'} ${label}: got ${actual.toFixed(4)}% | expected ~${expected.toFixed(4)}%`);
        return pass;
    };
    const checkVal = (label, actual, expected) => {
        const pass = Math.abs(actual - expected) / expected < 0.001;
        console.log(`${pass ? '✅' : '❌'} ${label}: got ${actual} | expected ${expected}`);
        return pass;
    };

    check('price_change_5m', p5m, exp5m);
    check('price_change_1h', p1h, exp1h);
    check('price_change_6h', p6h, exp6h);
    checkVal('marketcap',    mc,  expMC);
    checkVal('volume_24h',   vol, expVol);

    // ── 6. Cleanup ────────────────────────────────────────────────────────
    await client.query('DELETE FROM purchases WHERE token_id = $1', [tokenId]);
    await client.query('DELETE FROM tokens WHERE id = $1', [tokenId]);
    log('Cleanup done');

    await client.end();
    console.log('\n🏁 Done\n');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
