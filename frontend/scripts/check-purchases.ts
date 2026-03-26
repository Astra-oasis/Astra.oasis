import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

(async () => {
  const { query } = await import('../lib/db');

  const info = await query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'purchases' AND column_name IN ('buyer_address','seller_address','quantity') ORDER BY column_name"
  );
  console.log('Columns:', info.rows);

  const rows = await query(
    'SELECT id, buyer_address, seller_address, quantity, total_price, transaction_hash, created_at FROM purchases ORDER BY created_at DESC LIMIT 10'
  );
  console.log('Recent purchases:', rows.rows);

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
