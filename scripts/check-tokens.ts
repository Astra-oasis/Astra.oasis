import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkTokens() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Checking Tokens in Database');
  console.log('═══════════════════════════════════════════════════════\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const result = await pool.query(`
      SELECT id, name, symbol, contract_address, owner, created_at
      FROM tokens
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`Total tokens: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      console.log('Recent tokens:');
      result.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. [ID: ${row.id}] ${row.name} (${row.symbol})`);
        console.log(`   Contract: ${row.contract_address}`);
        console.log(`   Owner: ${row.owner}`);
        console.log(`   Created: ${row.created_at}`);
      });
    } else {
      console.log('❌ No tokens found! Create a token first.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

checkTokens().catch(console.error);
