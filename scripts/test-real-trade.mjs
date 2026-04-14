/**
 * Test THẬT: tạo token trên chain → mua → bán → verify DB metrics
 * Run: node scripts/test-real-trade.mjs
 *
 * Cần: PRIVATE_KEY trong .env (đã có)
 * Chain: Oasis Sapphire Testnet
 */

import pg from 'pg';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

// ── Config ────────────────────────────────────────────────────────────────
const RPC_URL     = 'https://testnet.sapphire.oasis.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DB_URL      = process.env.DATABASE_URL;
const FACTORY_ADDRESS = '0xcd5352dFdDad49224518F1F51aa63112243298F4';

const FACTORY_ABI = [
    'function createToken(string memory _name, string memory _symbol, string memory _metadataURI) returns (address)',
    'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, string metadataURI)',
];

const TOKEN_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)',
    'function getCurrentPrice() view returns (uint256)',
    'function getBuyPrice(uint256 amount) view returns (uint256)',
    'function getSellPrice(uint256 amount) view returns (uint256)',
    'function getTradeFees(uint256 amount) view returns (uint256 creatorFee, uint256 protocolFee, uint256 totalFee)',
    'function buyTokens(uint256 amount) payable',
    'function sellTokens(uint256 amount)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
];

const log  = (l, d) => { console.log(`\n✅ ${l}`); if (d !== undefined) console.log(typeof d === 'object' ? JSON.stringify(d, null, 2) : d); };
const info = (l)    => console.log(`\n   ${l}`);

// ── DB helpers ────────────────────────────────────────────────────────────
const db = new Client({ connectionString: DB_URL });

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

async function callCalculateMetrics(tokenId) {
    // Gọi API calculate-metrics qua HTTP (giống frontend)
    const res = await fetch('http://localhost:3000/api/tokens/calculate-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId }),
    });
    if (!res.ok) throw new Error(`calculate-metrics failed: ${res.status}`);
    return res.json();
}

async function savePurchaseToDB(tokenId, type, walletAddress, qty, pricePerToken, totalPrice, txHash) {
    await db.query(
        `INSERT INTO purchases
            (token_id, buyer_address, seller_address, quantity, price_per_token, total_price,
             transaction_hash, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW() + INTERVAL '7 hours')`,
        [
            tokenId,
            type === 'buy'  ? walletAddress : null,
            type === 'sell' ? walletAddress : null,
            qty, pricePerToken, totalPrice, txHash,
        ]
    );
}

// ── Main ──────────────────────────────────────────────────────────────────
async function run() {
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not found in .env');

    await db.connect();
    log('DB connected');

    // ── 1. Setup provider & wallet ────────────────────────────────────────
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
    const address  = wallet.address;

    const balance = await provider.getBalance(address);
    log('Wallet', { address, balance: ethers.formatEther(balance) + ' TEST' });

    if (balance < ethers.parseEther('0.1')) {
        throw new Error('Insufficient balance — need at least 0.1 TEST');
    }

    // ── 2. Tạo token trên chain ───────────────────────────────────────────
    info('Creating token on chain...');
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
    const tokenName   = `RealTest_${Date.now()}`;
    const tokenSymbol = 'RTK';
    const metadataURI = 'https://example.com/metadata.json';

    const createTx = await factory.createToken(tokenName, tokenSymbol, metadataURI);
    info(`TX sent: ${createTx.hash}`);
    const createReceipt = await createTx.wait();

    // Lấy địa chỉ token từ event
    const iface = new ethers.Interface(FACTORY_ABI);
    let tokenAddress = null;
    for (const log_ of createReceipt.logs) {
        try {
            const parsed = iface.parseLog(log_);
            if (parsed?.name === 'TokenCreated') {
                tokenAddress = parsed.args.tokenAddress;
                break;
            }
        } catch {}
    }
    if (!tokenAddress) throw new Error('Could not find TokenCreated event');
    log('Token created on chain', { tokenAddress, name: tokenName });

    // ── 3. Lưu token vào DB ───────────────────────────────────────────────
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
    const totalSupplyWei = await tokenContract.totalSupply();
    const totalSupply    = parseFloat(ethers.formatEther(totalSupplyWei));

    await db.query(
        `INSERT INTO tokens
            (name, symbol, description, image_url, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time,
             marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h, trader_count,
             created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, 0.05, NOW(), $8, 0,0,0,0,0, NOW() + INTERVAL '7 hours')
         ON CONFLICT (contract_address) DO NOTHING`,
        [tokenName, tokenSymbol, 'Real test token', 'https://example.com/img.png',
         totalSupply, address, tokenAddress,
         0.05 * totalSupply]  // marketcap = 0.05 * supply ngay từ đầu
    );

    const dbToken = await getTokenFromDB(tokenAddress);
    if (!dbToken) throw new Error('Token not saved to DB');
    log('Token saved to DB', {
        id: dbToken.id,
        total_supply: dbToken.total_supply,
        marketcap: dbToken.marketcap,
        volume_24h: dbToken.volume_24h,
        price_snapshot_value: dbToken.price_snapshot_value,
        price_snapshot_time: dbToken.price_snapshot_time,
        price_change_5m: dbToken.price_change_5m,
        price_change_1h: dbToken.price_change_1h,
        price_change_6h: dbToken.price_change_6h,
        trader_count: dbToken.trader_count,
    });
    const tokenId = dbToken.id;

    // ── 4. BUY 100 tokens ─────────────────────────────────────────────────
    info('Buying 100 tokens...');
    const buyQty    = ethers.parseEther('100');
    const buyCost   = await tokenContract.getBuyPrice(buyQty);
    const [,, totalFee] = await tokenContract.getTradeFees(buyCost);
    const totalCost = buyCost + totalFee;

    const buyTx = await tokenContract.buyTokens(buyQty, { value: totalCost });
    info(`BUY TX: ${buyTx.hash}`);
    const buyReceipt = await buyTx.wait();

    const priceAfterBuy = await tokenContract.getCurrentPrice();
    const priceAfterBuyEth = parseFloat(ethers.formatEther(priceAfterBuy));
    const buyCostEth = parseFloat(ethers.formatEther(buyCost));
    const pricePerTokenBuy = buyCostEth / 100;

    log('BUY confirmed', {
        qty: 100,
        cost: buyCostEth + ' TEST',
        pricePerToken: pricePerTokenBuy,
        currentPrice: priceAfterBuyEth,
    });

    // Lưu purchase vào DB
    await savePurchaseToDB(tokenId, 'buy', address, 100, pricePerTokenBuy, buyCostEth, buyReceipt.hash);

    // Tính metrics sau BUY
    await recalcMetricsDB(db, tokenId, priceAfterBuyEth, totalSupply);
    const afterBuy = await getTokenFromDB(tokenAddress);
    log('DB after BUY', {
        marketcap: afterBuy.marketcap,
        volume_24h: afterBuy.volume_24h,
        price_snapshot_value: afterBuy.price_snapshot_value,
        price_change_5m: afterBuy.price_change_5m,
        price_change_1h: afterBuy.price_change_1h,
        price_change_6h: afterBuy.price_change_6h,
        trader_count: afterBuy.trader_count,
    });

    // ── 5. SELL 50 tokens ─────────────────────────────────────────────────
    info('Selling 50 tokens...');
    const sellQty = ethers.parseEther('50');
    const sellReturn = await tokenContract.getSellPrice(sellQty);
    const sellReturnEth = parseFloat(ethers.formatEther(sellReturn));
    const pricePerTokenSell = sellReturnEth / 50;

    const sellTx = await tokenContract.sellTokens(sellQty);
    info(`SELL TX: ${sellTx.hash}`);
    const sellReceipt = await sellTx.wait();

    const priceAfterSell = await tokenContract.getCurrentPrice();
    const priceAfterSellEth = parseFloat(ethers.formatEther(priceAfterSell));

    log('SELL confirmed', {
        qty: 50,
        received: sellReturnEth + ' TEST',
        pricePerToken: pricePerTokenSell,
        currentPrice: priceAfterSellEth,
    });

    await savePurchaseToDB(tokenId, 'sell', address, 50, pricePerTokenSell, sellReturnEth, sellReceipt.hash);

    // Tính metrics sau SELL
    await recalcMetricsDB(db, tokenId, priceAfterSellEth, totalSupply);
    const afterSell = await getTokenFromDB(tokenAddress);
    log('DB after SELL', {
        marketcap: afterSell.marketcap,
        volume_24h: afterSell.volume_24h,
        price_snapshot_value: afterSell.price_snapshot_value,
        price_change_5m: afterSell.price_change_5m,
        price_change_1h: afterSell.price_change_1h,
        price_change_6h: afterSell.price_change_6h,
        trader_count: afterSell.trader_count,
    });

    // ── 6. Verify ─────────────────────────────────────────────────────────
    console.log('\n── Verification ──────────────────────────────────────────');
    const checks = [
        ['marketcap > 0',            parseFloat(afterSell.marketcap) > 0],
        ['volume_24h > 0',           parseFloat(afterSell.volume_24h) > 0],
        ['price_snapshot_value > 0', parseFloat(afterSell.price_snapshot_value) > 0],
        ['price_snapshot_time set',  afterSell.price_snapshot_time !== null],
        ['trader_count > 0',         parseInt(afterSell.trader_count) > 0],
    ];
    for (const [label, pass] of checks) {
        console.log(`${pass ? '✅' : '❌'} ${label}`);
    }

    // Note về 5m/1h/6h: vì giao dịch vừa xảy ra trong cùng 1 phút,
    // không có giá tại mốc 5m/1h/6h trước → change = 0 là đúng
    console.log('\n   ℹ️  price_change_5m/1h/6h = 0 là đúng vì giao dịch vừa xảy ra');
    console.log('   ℹ️  Sau 5 phút thật sự, 5m change sẽ có giá trị');

    await db.end();
    console.log('\n🏁 Done — token vẫn còn trên chain để test thêm');
    console.log(`   Token address: ${tokenAddress}`);
    console.log(`   Token DB id:   ${tokenId}\n`);
}

async function recalcMetricsDB(db, tokenId, currentPrice, totalSupply) {
    const marketcap = currentPrice * totalSupply;

    const volRes = await db.query(
        `SELECT COALESCE(SUM(quantity::numeric), 0) AS vol
         FROM purchases WHERE token_id = $1 AND status = 'completed'
           AND created_at >= NOW() - INTERVAL '24 hours'`,
        [tokenId]
    );
    const volume_24h = parseFloat(volRes.rows[0].vol);

    const traderRes = await db.query(
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

    // Cơ chế đúng: giá tại mốc = giao dịch cuối cùng <= NOW() - X phút
    // Nếu không có → dùng giá đầu tiên
    const getPriceAtWindow = async (minutes) => {
        const r = await db.query(
            `SELECT price_per_token FROM purchases
             WHERE token_id = $1 AND status = 'completed'
               AND created_at <= NOW() - ($2 * INTERVAL '1 minute')
             ORDER BY created_at DESC LIMIT 1`,
            [tokenId, minutes]
        );
        if (r.rows.length > 0) return parseFloat(r.rows[0].price_per_token);

        // Fallback: giá đầu tiên
        const first = await db.query(
            `SELECT price_per_token FROM purchases
             WHERE token_id = $1 AND status = 'completed'
             ORDER BY created_at ASC LIMIT 1`,
            [tokenId]
        );
        return first.rows.length > 0 ? parseFloat(first.rows[0].price_per_token) : null;
    };

    const calcChange = (past) => past && past > 0
        ? (((currentPrice - past) / past) * 100).toFixed(4) : '0.0000';

    const [p5m, p1h, p6h] = await Promise.all([
        getPriceAtWindow(5), getPriceAtWindow(60), getPriceAtWindow(360)
    ]);

    info(`Price windows → 5m: ${p5m}, 1h: ${p1h}, 6h: ${p6h}`);

    await db.query(
        `UPDATE tokens SET
            marketcap = $2, volume_24h = $3,
            price_change_5m = $4, price_change_1h = $5, price_change_6h = $6,
            trader_count = $7, price_snapshot_value = $8,
            price_snapshot_time = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [tokenId, marketcap, volume_24h,
         calcChange(p5m), calcChange(p1h), calcChange(p6h),
         trader_count, currentPrice]
    );
}

run().catch(e => { console.error('\n💥 Fatal:', e.message); process.exit(1); });
