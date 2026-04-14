import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS price_snapshots (
    id          SERIAL PRIMARY KEY,
    token_id    INTEGER NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    price       NUMERIC(36,18) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);
await client.query(`
  CREATE INDEX IF NOT EXISTS idx_price_snapshots_token_time
  ON price_snapshots(token_id, recorded_at DESC)
`);

// Seed từ purchases hiện có (mỗi giao dịch = 1 snapshot)
await client.query(`
  INSERT INTO price_snapshots (token_id, price, recorded_at)
  SELECT token_id, price_per_token, created_at
  FROM purchases
  WHERE status = 'completed'
  ON CONFLICT DO NOTHING
`);

const r = await client.query('SELECT COUNT(*) FROM price_snapshots');
console.log('price_snapshots rows:', r.rows[0].count);
await client.end();
console.log('Done');
