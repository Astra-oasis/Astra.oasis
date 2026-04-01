// Test database connection (standalone script)
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function testDBConnection() {
    console.log('=== Testing Database Connection ===\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        // 1. Test basic connection
        console.log('1️⃣ Testing PostgreSQL connection...');
        console.log('   DATABASE_URL:', process.env.DATABASE_URL);
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connected! Current time:', connectionTest.rows[0].current_time);

        // 2. Check if tokens table exists
        console.log('\n2️⃣ Checking tokens table...');
        const tokenCount = await pool.query('SELECT COUNT(*) as count FROM tokens');
        console.log(`✅ Tokens table exists. Total tokens: ${tokenCount.rows[0].count}`);

        // 3. Check transactions table
        console.log('\n3️⃣ Checking transactions table...');
        const txCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
        console.log(`✅ Transactions table exists. Total transactions: ${txCount.rows[0].count}`);

        // 4. Check purchases table
        console.log('\n4️⃣ Checking purchases table...');
        const purchaseCount = await pool.query('SELECT COUNT(*) as count FROM purchases');
        console.log(`✅ Purchases table exists. Total purchases: ${purchaseCount.rows[0].count}`);

        // 5. List all columns in tokens table
        console.log('\n5️⃣ Tokens table schema:');
        const tokenSchema = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tokens'
            ORDER BY ordinal_position
        `);
        console.log('📋 Columns:');
        tokenSchema.rows.forEach((col: any) => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
        });

        console.log('\n✅ Database is ready! You can create tokens now.\n');
        await pool.end();

    } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n⚠️ Make sure:');
        console.log('   1. PostgreSQL is running');
        console.log('   2. DATABASE_URL is set in .env.local');
        console.log('   3. Database and tables are created using schema.sql');
        console.log('   4. Example: postgresql://postgres:password@localhost:5432/astra_oasis\n');
        await pool.end();
        process.exit(1);
    }
}

testDBConnection().catch(console.error);
