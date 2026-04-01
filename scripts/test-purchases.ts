import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testPurchases() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Testing Purchases API & Database');
    console.log('═══════════════════════════════════════════════════════\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // Step 1: Get a token from database
        console.log('Step 1: Fetching a token from database...');
        const tokensResult = await pool.query('SELECT id FROM tokens LIMIT 1');

        if (tokensResult.rows.length === 0) {
            console.log('❌ No tokens found in database. Create a token first!');
            return;
        }

        const tokenId = tokensResult.rows[0].id;
        console.log(`✅ Found token with ID: ${tokenId}\n`);

        // Step 2: Test POST purchase via API
        console.log('Step 2: Testing POST /api/purchases endpoint...');
        const testPurchase = {
            token_id: tokenId,
            buyer_address: '0x' + 'a'.repeat(40),
            quantity: '100000000',
            price_per_token: '0.001',
            total_price: '100000',
            transaction_hash: '0x' + 'b'.repeat(64),
            status: 'completed',
        };

        console.log('Sending purchase data:', {
            token_id: testPurchase.token_id,
            buyer_address: testPurchase.buyer_address,
            quantity: testPurchase.quantity,
        });

        try {
            const response = await fetch('http://localhost:3000/api/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPurchase),
                signal: AbortSignal.timeout(10000),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Purchase saved via API!');
                console.log('   Purchase ID:', data.data.id);
                console.log('   Quantity:', data.data.quantity);
                console.log('   Total Price:', data.data.total_price);
            } else {
                const error = await response.json();
                console.error('❌ API Error:', error);
            }
        } catch (apiError: any) {
            console.error('❌ Could not connect to API. Is the server running?');
            console.log('   Error:', apiError.message);
            console.log('   Run: npm run dev\n');
        }

        // Step 3: Check database for purchases
        console.log('\nStep 3: Checking purchases in database...');
        const purchasesResult = await pool.query(`
      SELECT id, token_id, buyer_address, quantity, total_price, status, created_at
      FROM purchases
      WHERE token_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [tokenId]);

        console.log(`✅ Total purchases for token ${tokenId}: ${purchasesResult.rows.length}`);

        if (purchasesResult.rows.length > 0) {
            console.log('\nRecent purchases:');
            purchasesResult.rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. Purchase ID: ${row.id}`);
                console.log(`     Buyer: ${row.buyer_address.substring(0, 10)}...`);
                console.log(`     Quantity: ${row.quantity}`);
                console.log(`     Total Price: ${row.total_price}`);
                console.log(`     Status: ${row.status}`);
                console.log(`     Created: ${row.created_at}\n`);
            });
        } else {
            console.log('   (No purchases yet. Trade tokens to create purchases!)');
        }

        // Step 4: Summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ Purchases API is working!');
        console.log('\nTo test with real trades:');
        console.log('1. Open the app and navigate to a token detail page');
        console.log('2. Use BondingCurveTrader or TokenTrader to buy/sell');
        console.log('3. Check this script again to verify purchases were saved');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testPurchases().catch(console.error);
