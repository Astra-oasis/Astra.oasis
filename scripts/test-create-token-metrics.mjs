/**
 * Test: tạo token mới → check DB ngay lập tức
 * Run: node scripts/test-create-token-metrics.mjs
 */
import { ethers } from 'ethers';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });

const RPC_URL = 'https://testnet.sapphire.oasis.io';
const FACTORY_ADDRESS = '0xdC33D9c286fa789DCC1561A4F3bd85781Bc75760';
const FACTORY_ABI = [
    'function createToken(string,string,string) returns (address)',
    'event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, string metadataURI)',
];

const fmt = (v) => parseFloat(v).toLocaleString();

async function run() {
    await db.connect();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log(`\n🔑 ${wallet.address}\n`);

    // 1. Deploy token
    console.log('── STEP 1: Deploy token on chain ──');
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
    const tx = await factory.createToken(`QuickTest_${Date.now()}`, 'QTK', 'ipfs://test');
    const receipt = await tx.wait();

    const iface = new ethers.Interface(FACTORY_ABI);
    let tokenAddress = null;
    for (const log of receipt.logs) {
        try { const p = iface.parseLog(log); if (p?.name === 'TokenCreated') { tokenAddress = p.args.tokenAddress; break; } } catch {}
    }
    console.log(`✅ Token deployed: ${tokenAddress}`);

    // 2. Lấy getCurrentPrice từ chain
    const priceRes = await fetch(RPC_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc:'2.0', method:'eth_call', params:[{ to: tokenAddress, data:'0xeb91d37e' },'latest'], id:1 })
    });
    const priceData = await priceRes.json();
    const chainPrice = parseInt(priceData.result, 16) / 1e18;
    console.log(`   getCurrentPrice() from chain: ${chainPrice}`);

    // 3. Lưu vào DB (giống frontend làm)
    const TOTAL_SUPPLY = 1_000_000_000;
    const marketcap = chainPrice * TOTAL_SUPPLY;

    const t0 = Date.now();
    await db.query(
        `INSERT INTO tokens (name, symbol, description, image_url, total_supply, owner, contract_address,
             price_snapshot_value, price_snapshot_time,
             marketcap, volume_24h, price_change_5m, price_change_1h, price_change_6h, trader_count,
             created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, $8, NOW(), $9, 0,0,0,0,0, NOW() + INTERVAL '7 hours')
         ON CONFLICT (contract_address) DO NOTHING`,
        ['QuickTest', 'QTK', 'Test', '', TOTAL_SUPPLY, wallet.address, tokenAddress, chainPrice, marketcap]
    );
    const t1 = Date.now();

    // 4. Đọc lại ngay lập tức
    const r = await db.query(
        `SELECT id, marketcap, price_snapshot_value, price_snapshot_time, created_at
         FROM tokens WHERE LOWER(contract_address) = LOWER($1)`,
        [tokenAddress]
    );
    const t2 = Date.now();

    const row = r.rows[0];
    console.log(`\n── STEP 2: DB state (read ${t2 - t0}ms after deploy) ──`);
    console.log(`   id:                   ${row.id}`);
    console.log(`   marketcap:            ${fmt(row.marketcap)}`);
    console.log(`   price_snapshot_value: ${row.price_snapshot_value}`);
    console.log(`   price_snapshot_time:  ${row.price_snapshot_time}`);
    console.log(`   INSERT took:          ${t1 - t0}ms`);
    console.log(`   READ took:            ${t2 - t1}ms`);

    const mcOk = parseFloat(row.marketcap) > 0;
    const priceOk = parseFloat(row.price_snapshot_value) > 0;
    console.log(`\n${mcOk ? '✅' : '❌'} marketcap > 0: ${fmt(row.marketcap)}`);
    console.log(`${priceOk ? '✅' : '❌'} price_snapshot_value > 0: ${row.price_snapshot_value}`);

    // Cleanup
    await db.query('DELETE FROM tokens WHERE id = $1', [row.id]);
    console.log('\n✅ Cleanup done\n');
    await db.end();
}

run().catch(e => { console.error('💥', e.message); process.exit(1); });
