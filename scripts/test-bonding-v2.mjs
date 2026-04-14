/**
 * Test TokenPolicyMintV2 — Phần 1 (verify giá) + Phần 3 (scenarios thật)
 * Run: node scripts/test-bonding-v2.mjs
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const RPC_URL     = 'https://testnet.sapphire.oasis.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const artifactPath = join(__dirname, '../artifacts/contracts/TokenPolicyMintV2.sol/TokenPolicyMintV2.json');
const artifact     = JSON.parse(readFileSync(artifactPath, 'utf8'));

const PASS = '✅'; const FAIL = '❌';
let passed = 0; let failed = 0;

const fmt    = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(6) + ' TEST';
const fmtTok = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(0) + ' tokens';
const tok    = (n)   => ethers.parseEther(n.toString());

// ── Helpers ───────────────────────────────────────────────────────────────

async function check(label, fn) {
    try {
        const r = await fn();
        console.log(`${PASS} ${label}${r !== undefined ? ' → ' + r : ''}`);
        passed++;
    } catch (e) {
        console.log(`${FAIL} ${label} — ${e.reason || e.message?.slice(0, 80)}`);
        failed++;
    }
}

async function buy(c, wallet, amount, label) {
    const amtWei = tok(amount);
    const cost   = await c.getBuyPrice(amtWei);
    const [,,fee] = await c.getTradeFees(cost);
    const tx = await c.buyTokens(amtWei, { value: cost + fee });
    await tx.wait();
    const [price, bal] = await Promise.all([c.getCurrentPrice(), c.balanceOf(wallet.address)]);
    console.log(`${PASS} ${label} | cost: ${fmt(cost)} | price: ${fmt(price)} | holding: ${fmtTok(bal)}`);
    passed++;
    return cost;
}

async function sell(c, wallet, amountWei, label) {
    const refund = await c.getSellPrice(amountWei);
    const tx = await c.sellTokens(amountWei);
    await tx.wait();
    const [price, bal] = await Promise.all([c.getCurrentPrice(), c.balanceOf(wallet.address)]);
    console.log(`${PASS} ${label} | refund: ${fmt(refund)} | price: ${fmt(price)} | holding: ${fmtTok(bal)}`);
    passed++;
    return refund;
}

async function sellAll(c, wallet, label) {
    const bal = await c.balanceOf(wallet.address);
    if (bal === 0n) { console.log(`   (skip ${label} — balance = 0)`); return; }
    return sell(c, wallet, bal, label);
}

// ── Deploy ────────────────────────────────────────────────────────────────

async function deploy(wallet) {
    console.log('   Deploying TokenPolicyMintV2...');
    const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const contract = await factory.deploy('TestV2', 'TV2', 'ipfs://test', wallet.address);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`   Deployed: ${addr}\n`);
    return contract;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function run() {
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not in .env');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
    const balance  = await provider.getBalance(wallet.address);
    console.log(`\n🔑 ${wallet.address}`);
    console.log(`   Balance: ${fmt(balance)}\n`);

    const c = await deploy(wallet);

    // ════════════════════════════════════════════════════════════════
    console.log('══ PHẦN 1: VERIFY GIÁ ══════════════════════════════════════');

    await check('getCurrentPrice() = 0.000001 TEST (start price)', async () => {
        const p = await c.getCurrentPrice();
        const eth = parseFloat(ethers.formatEther(p));
        if (Math.abs(eth - 0.000001) > 1e-9) throw new Error(`got ${eth}`);
        return fmt(p);
    });

    await check('getBuyPrice(50,000 tokens) ≤ 100 TEST', async () => {
        const cost = await c.getBuyPrice(tok(50000));
        const eth  = parseFloat(ethers.formatEther(cost));
        if (eth > 100) throw new Error(`cost = ${eth} TEST > 100`);
        return `${eth.toFixed(6)} TEST`;
    });

    await check('getBuyPrice(1 token) > 0', async () => {
        const p = await c.getBuyPrice(tok(1));
        if (p === 0n) throw new Error('price is 0');
        return fmt(p);
    });

    await check('getSellPrice(0) = 0', async () => {
        const p = await c.getSellPrice(0n);
        if (p !== 0n) throw new Error(`expected 0, got ${p}`);
        return '0 ✓';
    });

    await check('getTradeFees tính đúng (1.1% tổng)', async () => {
        const base = ethers.parseEther('1');
        const [cFee, pFee, total] = await c.getTradeFees(base);
        const pct = parseFloat(ethers.formatEther(total)) * 100;
        if (Math.abs(pct - 1.1) > 0.001) throw new Error(`fee = ${pct}%`);
        return `creator=${fmt(cFee)} protocol=${fmt(pFee)} total=${pct.toFixed(2)}%`;
    });

    // ════════════════════════════════════════════════════════════════
    console.log('\n══ PHẦN 3: CASE CƠ BẢN ════════════════════════════════════');

    // Case 1: Mua nhiều lần → bán 1 lần
    console.log('\n── Case 1: Mua nhiều lần → bán 1 lần ──');
    await buy(c, wallet, 1000, 'BUY 1,000');
    await buy(c, wallet, 2000, 'BUY 2,000');
    await buy(c, wallet, 3000, 'BUY 3,000');
    await sellAll(c, wallet, 'SELL tất cả (6,000)');

    // Case 2: Mua 1 lần lớn → bán nhiều lần nhỏ
    console.log('\n── Case 2: Mua lớn → bán nhiều lần nhỏ ──');
    await buy(c, wallet, 10000, 'BUY 10,000');
    await sell(c, wallet, tok(2000), 'SELL 2,000');
    await sell(c, wallet, tok(3000), 'SELL 3,000');
    await sell(c, wallet, tok(5000), 'SELL 5,000');

    // Case 3: Mua → bán → mua lại
    console.log('\n── Case 3: Mua → bán → mua lại ──');
    await buy(c, wallet, 5000, 'BUY 5,000');
    await sell(c, wallet, tok(5000), 'SELL 5,000');
    await buy(c, wallet, 5000, 'BUY lại 5,000');
    await sellAll(c, wallet, 'SELL tất cả');

    // Case 4: DCA nhỏ → bán hết
    console.log('\n── Case 4: DCA nhỏ → bán hết ──');
    for (let i = 1; i <= 5; i++) {
        await buy(c, wallet, 500, `DCA BUY #${i} (500)`);
    }
    await sellAll(c, wallet, 'SELL tất cả DCA (2,500)');

    // ════════════════════════════════════════════════════════════════
    console.log('\n══ PHẦN 3: STRESS CASES ════════════════════════════════════');

    // 7 lần mua liên tiếp
    console.log('\n── Stress: 7 lần mua liên tiếp ──');
    for (let i = 1; i <= 7; i++) {
        await buy(c, wallet, 1000, `BUY #${i} (1,000)`);
    }

    // 7 lần bán liên tiếp
    console.log('\n── Stress: 7 lần bán liên tiếp ──');
    const balStress = await c.balanceOf(wallet.address);
    const chunk     = balStress / 7n;
    for (let i = 1; i <= 6; i++) {
        await sell(c, wallet, chunk, `SELL #${i}`);
    }
    await sellAll(c, wallet, 'SELL #7 (phần còn lại)');

    // Luân phiên buy-sell
    console.log('\n── Stress: Luân phiên buy-sell (5 vòng) ──');
    for (let i = 1; i <= 5; i++) {
        await buy(c, wallet, 2000, `BUY #${i}`);
        await sell(c, wallet, tok(2000), `SELL #${i}`);
    }

    // ════════════════════════════════════════════════════════════════
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊  ${PASS} ${passed} passed   ${FAIL} ${failed} failed`);
    console.log(`${'═'.repeat(60)}\n`);

    if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('\n💥', e.message); process.exit(1); });
