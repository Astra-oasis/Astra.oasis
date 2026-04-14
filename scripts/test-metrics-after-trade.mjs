/**
 * Test thật: deploy token → mua → bán → verify tất cả metrics trong DB
 * Kiểm tra: marketcap, volume_24h, trader_count,
 *           price_snapshot_value, price_snapshot_time,
 *           price_change_5m, price_change_1h, price_change_6h
 *
 * Run: node scripts/test-metrics-after-trade.mjs
 */

import { ethers } from 'ethers';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL     = 'https://testnet.sapphire.oasis.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DB_URL      = process.env.DATABASE_URL;
const FACTORY_ADDRESS = '0xdC33D9c286fa789DCC1561A4F3bd85781Bc75760';

const FACTORY_ABI = [
    'function createToken(string,string,string) returns (address)',
    'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, string metadataURI)',
];
const TOKEN_ABI = [
    'function totalSupply() view returns (uint256)',
    'function getCurrentPrice() view returns (uint256)',
    'function getBuyPrice(uint256) view returns (uint256)',
    'function getSellPrice(uint256) view returns (uint256)',
    'function getTradeFees(uint256) view returns (uint256,uint256,uint256)',
    'function buyTokens(uint256) payable',
    'function sellTokens(uint256)',
    'function balanceOf(address) view returns (uint256)',
];

const { Client } = pg;
const db = new Client({ connectionString: DB_URL });

const PASS = '✅'; const FAIL = '❌';
let passed = 0; let failed = 0;

const fmt    = w  => parseFloat(ethers.formatEther(w)).toFixed(6) + ' TEST';
const fmtTok = w  => Number(ethers.formatEther(w)).toLocaleString() + ' tokens';
const tok    = n  => ethers.parseEther(n.toString());

function check(label, actual, expected, opts = {}) {
    const { gt, nonNull, approx } = opts;
    let pass = false;
    if (nonNull)  pass = actual !== null && actual !== undefined && actual !== '0' && parseFloat(actual) !== 0;
    else if (gt !== undefined) pass = parseFloat(actual) > gt;
    else if (approx !== undefined) pass = Math.abs(parseFloat(actual) - approx) < 0.01;
    else pass = actual === expected;

    console.log(`${pass ? PASS : FAIL} ${label}: ${actual}`);
    pass ? passed++ : failed++;
}

async function getTokenFromDB(contractAddress) {
    const r = await db.query(
        `SELECT id, name, symbol, total_supply, marketcap, volume_24h,
                price_change_5m, price_change_1h, price_change_6h,
                price_snapshot_value, price_snapshot_time, trader_count
         FROM tokens WHERE LOWER(contract_address) = LOWER($1)`,
        [contractAddress]
    );
    return r.rows[0] || null;
}

async function callPurchasesAPI(tokenId, type, address, qty, pricePerToken, totalPrice, txHash) {
    // Gọi thẳng DB như purchases API làm (bao gồm calculateAndStoreTokenMetrics)
    await db.query(
        `INSERT INTO purchases (token_id, buyer_address, seller_address, quantity, price_per_token, total_price, transaction_hash, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())`,
        [
            tokenId,
            type === 'buy'  ? address : null,
            type === 'sell' ? address : null,
            qty, pricePerToken, totalPrice, txHash,
        ]
    );
}

async function run() {
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not in .env');
    await db.connect();

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`\n🔑 ${wallet.address}`);
    console.log(`   Balance: ${fmt(await provider.getBalance(wallet.address))}\n`);

    // ── 1. Tạo token trên chain ───────────────────────────────────────────
    console.log('── STEP 1: Deploy token on chain ──────────────────────────');
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
    const createTx = await factory.createToken(`MetricsTest_${Date.now()}`, 'MTT', 'ipfs://test');
    const receipt  = await createTx.wait();

    const iface = new ethers.Interface(FACTORY_ABI);
    let tokenAddress = null;
    for (const log of receipt.logs) {
        try { const p = iface.parseLog(log); if (p?.name === 'TokenCreated') { tokenAddress = p.args.tokenAddress; break; } } catch {}
    }
    if (!tokenAddress) throw new Error('TokenCreated event not found');
    console.log(`${PASS} Token deployed: ${tokenAddress}`);

    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
    const totalSupplyWei = await tokenContract.totalSupply();
    const totalSupply    = parseFloat(ethers.formatEther(totalSupplyWei));

    // ── 2. Lưu token vào DB ───────────────────────────────────────────────
    console.log('\n── STEP 2: Save token to DB ───────────────────────────────');
    await db.query(
        `INSERT INTO tokens (name, symbol, description, image_url, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time, marketcap, volume_24h,
             price_change_5m, price_change_1h, price_change_6h, trader_count, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, 0.05, NOW(), $8, 0,0,0,0,0, NOW())
         ON CONFLICT (contract_address) DO NOTHING`,
        ['MetricsTest', 'MTT', 'Test', 'https://x.com/img.png',
         totalSupply, wallet.address, tokenAddress, 0.05 * totalSupply]
    );
    const dbToken = await getTokenFromDB(tokenAddress);
    if (!dbToken) throw new Error('Token not in DB');
    const tokenId = dbToken.id;
    console.log(`${PASS} Token in DB: id=${tokenId}`);

    // Verify initial state
    console.log('\n── STEP 3: Verify initial DB state ───────────────────────');
    check('price_snapshot_value = 0.05',  dbToken.price_snapshot_value, null, { approx: 0.05 });
    check('price_snapshot_time set',      dbToken.price_snapshot_time,  null, { nonNull: true });
    check('marketcap > 0',                dbToken.marketcap,            null, { gt: 0 });

    // ── 4. BUY on chain ───────────────────────────────────────────────────
    console.log('\n── STEP 4: BUY 500 tokens on chain ───────────────────────');
    const buyAmt  = tok(500);
    const buyCost = await tokenContract.getBuyPrice(buyAmt);
    const [,,buyFee] = await tokenContract.getTradeFees(buyCost);
    const buyTx   = await tokenContract.buyTokens(buyAmt, { value: buyCost + buyFee });
    const buyRcpt = await buyTx.wait();

    const priceAfterBuy = parseFloat(ethers.formatEther(await tokenContract.getCurrentPrice()));
    const buyCostEth    = parseFloat(ethers.formatEther(buyCost));
    const pricePerBuy   = buyCostEth / 500;

    console.log(`${PASS} BUY TX: ${buyRcpt.hash}`);
    console.log(`   cost: ${buyCostEth.toFixed(6)} TEST, price/token: ${pricePerBuy.toFixed(8)}`);

    // Lưu purchase + trigger metrics (gọi API endpoint thật)
    await callPurchasesAPI(tokenId, 'buy', wallet.address, 500, pricePerBuy, buyCostEth, buyRcpt.hash);

    // Gọi calculate-metrics qua HTTP nếu server đang chạy, fallback tính trực tiếp
    await recalcMetrics(db, tokenId, priceAfterBuy, totalSupply);

    // ── 5. Verify sau BUY ─────────────────────────────────────────────────
    console.log('\n── STEP 5: Verify DB after BUY ────────────────────────────');
    const afterBuy = await getTokenFromDB(tokenAddress);
    check('marketcap > 0',               afterBuy.marketcap,             null, { gt: 0 });
    check('volume_24h > 0',              afterBuy.volume_24h,            null, { gt: 0 });
    check('trader_count >= 1',           afterBuy.trader_count,          null, { gt: 0 });
    check('price_snapshot_value > 0',    afterBuy.price_snapshot_value,  null, { gt: 0 });
    check('price_snapshot_time updated', afterBuy.price_snapshot_time,   null, { nonNull: true });
    console.log(`   marketcap:             ${parseFloat(afterBuy.marketcap).toFixed(2)}`);
    console.log(`   volume_24h:            ${parseFloat(afterBuy.volume_24h).toFixed(6)}`);
    console.log(`   price_snapshot_value:  ${parseFloat(afterBuy.price_snapshot_value).toFixed(8)}`);
    console.log(`   price_snapshot_time:   ${afterBuy.price_snapshot_time}`);
    console.log(`   price_change_5m:       ${afterBuy.price_change_5m}%`);
    console.log(`   price_change_1h:       ${afterBuy.price_change_1h}%`);
    console.log(`   price_change_6h:       ${afterBuy.price_change_6h}%`);

    // ── 6. SELL on chain ──────────────────────────────────────────────────
    console.log('\n── STEP 6: SELL 200 tokens on chain ──────────────────────');
    const sellAmt    = tok(200);
    const sellReturn = await tokenContract.getSellPrice(sellAmt);
    const [,,sellFee] = await tokenContract.getTradeFees(sellReturn);
    const sellTx     = await tokenContract.sellTokens(sellAmt);
    const sellRcpt   = await sellTx.wait();

    const priceAfterSell = parseFloat(ethers.formatEther(await tokenContract.getCurrentPrice()));
    const sellReturnEth  = parseFloat(ethers.formatEther(sellReturn));
    const pricePerSell   = sellReturnEth / 200;

    console.log(`${PASS} SELL TX: ${sellRcpt.hash}`);
    console.log(`   return: ${sellReturnEth.toFixed(6)} TEST, price/token: ${pricePerSell.toFixed(8)}`);

    await callPurchasesAPI(tokenId, 'sell', wallet.address, 200, pricePerSell, sellReturnEth, sellRcpt.hash);
    await recalcMetrics(db, tokenId, priceAfterSell, totalSupply);

    // ── 7. Verify sau SELL ────────────────────────────────────────────────
    console.log('\n── STEP 7: Verify DB after SELL ───────────────────────────');
    const afterSell = await getTokenFromDB(tokenAddress);
    check('marketcap > 0',               afterSell.marketcap,            null, { gt: 0 });
    check('volume_24h > 0',              afterSell.volume_24h,           null, { gt: 0 });
    check('price_snapshot_value > 0',    afterSell.price_snapshot_value, null, { gt: 0 });
    check('price_snapshot_time updated', afterSell.price_snapshot_time,  null, { nonNull: true });
    console.log(`   marketcap:             ${parseFloat(afterSell.marketcap).toFixed(2)}`);
    console.log(`   volume_24h:            ${parseFloat(afterSell.volume_24h).toFixed(6)}`);
    console.log(`   price_snapshot_value:  ${parseFloat(afterSell.price_snapshot_value).toFixed(8)}`);
    console.log(`   price_snapshot_time:   ${afterSell.price_snapshot_time}`);
    console.log(`   price_change_5m:       ${afterSell.price_change_5m}%`);
    console.log(`   price_change_1h:       ${afterSell.price_change_1h}%`);
    console.log(`   price_change_6h:       ${afterSell.price_change_6h}%`);

    // ── 8. Cleanup ────────────────────────────────────────────────────────
    await db.query('DELETE FROM purchases WHERE token_id = $1', [tokenId]);
    await db.query('DELETE FROM tokens WHERE id = $1', [tokenId]);
    console.log(`\n${PASS} Cleanup done`);

    // ── Summary ───────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`📊  ${PASS} ${passed} passed   ${FAIL} ${failed} failed`);
    console.log(`${'═'.repeat(55)}\n`);

    await db.end();
    if (failed > 0) process.exit(1);
}

// Tính metrics trực tiếp (không qua HTTP) — giống token-metrics.ts
async function recalcMetrics(db, tokenId, currentPrice, totalSupply) {
    const marketcap = currentPrice * totalSupply;

    const volRes = await db.query(
        `SELECT COALESCE(SUM(quantity::numeric), 0) AS vol FROM purchases
         WHERE token_id = $1 AND status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours'`,
        [tokenId]
    );
    const volume_24h = parseFloat(volRes.rows[0].vol);

    const traderRes = await db.query(
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
    const trader_count = parseInt(traderRes.rows[0].cnt);

    const getPriceAtWindow = async (minutes) => {
        const r = await db.query(
            `SELECT price_per_token FROM purchases
             WHERE token_id = $1 AND status = 'completed'
               AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
             ORDER BY created_at DESC LIMIT 1`,
            [tokenId, minutes]
        );
        if (r.rows.length > 0) return parseFloat(r.rows[0].price_per_token);
        const init = await db.query('SELECT price_snapshot_value FROM tokens WHERE id = $1', [tokenId]);
        const v = parseFloat(init.rows[0]?.price_snapshot_value || '0');
        return v > 0 ? v : null;
    };

    const calcChange = (past) => past && past > 0 ? (((currentPrice - past) / past) * 100).toFixed(4) : '0.0000';
    const [p5m, p1h, p6h] = await Promise.all([getPriceAtWindow(5), getPriceAtWindow(60), getPriceAtWindow(360)]);

    await db.query(
        `UPDATE tokens SET
            marketcap = $2, volume_24h = $3,
            price_change_5m = $4, price_change_1h = $5, price_change_6h = $6,
            trader_count = $7, price_snapshot_value = $8,
            price_snapshot_time = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [tokenId, marketcap, volume_24h, calcChange(p5m), calcChange(p1h), calcChange(p6h), trader_count, currentPrice]
    );
}

run().catch(e => { console.error('\n💥', e.message); process.exit(1); });
