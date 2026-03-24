#!/usr/bin/env node

import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function testMetricsSystem() {
    try {
        console.log('🧪 Testing Token Metrics System...\n');

        // Test 1: Check database connection
        console.log('1️⃣  Testing database connection...');
        const versionResult = await pool.query('SELECT version()');
        console.log('✅ Database connected!\n');

        // Test 2: Check if new columns exist
        console.log('2️⃣  Checking if metrics columns exist...');
        const columnsResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tokens'
            AND column_name IN (
                'marketcap', 'volume_24h', 'price_change_5m', 
                'price_change_1h', 'price_change_6h', 'trader_count'
            )
            ORDER BY column_name;
        `);

        if (columnsResult.rows.length === 0) {
            console.log('❌ Metrics columns NOT FOUND! Need to run migration first.\n');
            console.log('Run: npx tsx scripts/run-migration.ts\n');
        } else {
            console.log(`✅ Found ${columnsResult.rows.length} metrics columns:`);
            columnsResult.rows.forEach((col) => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
            console.log();
        }

        // Test 3: Check tokens table
        console.log('3️⃣  Checking tokens table...');
        const tokensResult = await pool.query('SELECT COUNT(*) as count FROM tokens');
        const tokenCount = tokensResult.rows[0].count;
        console.log(`✅ Total tokens in DB: ${tokenCount}\n`);

        if (tokenCount > 0) {
            // Test 4: Show sample token with metrics
            console.log('4️⃣  Sample token with metrics:');
            const sampleToken = await pool.query(`
                SELECT id, name, symbol, marketcap, volume_24h, 
                       price_change_5m, price_change_1h, price_change_6h, 
                       trader_count, updated_at
                FROM tokens
                LIMIT 1;
            `);

            const token = sampleToken.rows[0];
            console.log(`
   ID: ${token.id}
   Name: ${token.name}
   Symbol: ${token.symbol}
   Market Cap: ${token.marketcap || 0}
   Volume 24h: ${token.volume_24h || 0}
   Price Change 5m: ${token.price_change_5m || 0}%
   Price Change 1h: ${token.price_change_1h || 0}%
   Price Change 6h: ${token.price_change_6h || 0}%
   Trader Count: ${token.trader_count || 0}
   Last Updated: ${token.updated_at || 'Never'}
            `);
        }

        // Test 5: Check purchases table
        console.log('5️⃣  Checking purchases table...');
        const purchasesResult = await pool.query('SELECT COUNT(*) as count FROM purchases');
        const purchaseCount = purchasesResult.rows[0].count;
        console.log(`✅ Total purchases in DB: ${purchaseCount}\n`);

        if (purchaseCount > 0) {
            const recentPurchases = await pool.query(`
                SELECT id, token_id, buyer_address, seller_address, quantity, 
                       price_per_token, total_price, created_at
                FROM purchases
                ORDER BY created_at DESC
                LIMIT 3;
            `);

            console.log('📊 Recent purchases:');
            recentPurchases.rows.forEach((p, idx) => {
                console.log(`
   ${idx + 1}. Token ID: ${p.token_id}
      Buyer: ${p.buyer_address?.substring(0, 10)}...
      Seller: ${p.seller_address?.substring(0, 10) || 'Contract'}...
      Quantity: ${p.quantity}
      Price/Token: ${p.price_per_token}
      Total: ${p.total_price}
      Time: ${p.created_at}
                `);
            });
        }

        console.log('✨ Test completed successfully!\n');
        console.log('🎯 Next steps:');
        console.log('   1. Make a purchase to test metrics calculation');
        console.log('   2. Check API: POST /api/tokens/calculate-metrics');
        console.log('   3. Check metrics: GET /api/tokens/update-metrics?token_id=1\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testMetricsSystem();
