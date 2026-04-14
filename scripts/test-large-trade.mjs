/**
 * Test: mua 50,000 + 100,000 tokens rồi bán hết
 * Run: node scripts/test-large-trade.mjs
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

const artifact = JSON.parse(readFileSync(
    join(__dirname, '../artifacts/contracts/TokenPolicyMintV2.sol/TokenPolicyMintV2.json'), 'utf8'
));

const fmt    = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(6) + ' TEST';
const fmtTok = (wei) => Number(ethers.formatEther(wei)).toLocaleString() + ' tokens';
const tok    = (n)   => ethers.parseEther(n.toString());

async function run() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`\n🔑 ${wallet.address}`);
    console.log(`   Balance: ${fmt(await provider.getBalance(wallet.address))}\n`);

    // Deploy
    console.log('   Deploying...');
    const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const c        = await factory.deploy('LargeTest', 'LGT', 'ipfs://test', wallet.address);
    await c.waitForDeployment();
    console.log(`   Deployed: ${await c.getAddress()}\n`);

    // ── BUY 50,000 ────────────────────────────────────────────────────────
    const cost1 = await c.getBuyPrice(tok(50000));
    const [,,fee1] = await c.getTradeFees(cost1);
    console.log(`📥 BUY 50,000 tokens`);
    console.log(`   Cost: ${fmt(cost1)} + fee: ${fmt(fee1)} = total: ${fmt(cost1 + fee1)}`);
    await (await c.buyTokens(tok(50000), { value: cost1 + fee1 })).wait();
    console.log(`   Price after: ${fmt(await c.getCurrentPrice())}`);
    console.log(`   Holding: ${fmtTok(await c.balanceOf(wallet.address))}\n`);

    // ── BUY 100,000 ───────────────────────────────────────────────────────
    const cost2 = await c.getBuyPrice(tok(100000));
    const [,,fee2] = await c.getTradeFees(cost2);
    console.log(`📥 BUY 100,000 tokens`);
    console.log(`   Cost: ${fmt(cost2)} + fee: ${fmt(fee2)} = total: ${fmt(cost2 + fee2)}`);
    await (await c.buyTokens(tok(100000), { value: cost2 + fee2 })).wait();
    console.log(`   Price after: ${fmt(await c.getCurrentPrice())}`);
    console.log(`   Holding: ${fmtTok(await c.balanceOf(wallet.address))}\n`);

    // ── SELL ALL ──────────────────────────────────────────────────────────
    const bal = await c.balanceOf(wallet.address);
    const refund = await c.getSellPrice(bal);
    const [,,fee3] = await c.getTradeFees(refund);
    console.log(`📤 SELL ALL (${fmtTok(bal)})`);
    console.log(`   Refund: ${fmt(refund)} - fee: ${fmt(fee3)} = net: ${fmt(refund - fee3)}`);
    await (await c.sellTokens(bal)).wait();
    console.log(`   Price after: ${fmt(await c.getCurrentPrice())}`);
    console.log(`   Holding: ${fmtTok(await c.balanceOf(wallet.address))}\n`);

    // ── Summary ───────────────────────────────────────────────────────────
    const totalSpent = cost1 + cost2;
    const netBack    = refund - fee3;
    const loss       = totalSpent - netBack;
    console.log('── Summary ──────────────────────────────────────────────');
    console.log(`   Total cost (excl fee): ${fmt(totalSpent)}`);
    console.log(`   Net received:          ${fmt(netBack)}`);
    console.log(`   Loss (fees + slippage): ${fmt(loss)}`);
    console.log('✅ Done\n');
}

run().catch(e => { console.error('💥', e.message); process.exit(1); });
