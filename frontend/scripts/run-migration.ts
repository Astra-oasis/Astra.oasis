import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function runMigration() {
    try {
        console.log('🚀 Starting migrations...\n');

        const migrationsDir = path.join(__dirname, '../../migrations');
        const migrationFiles = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        if (migrationFiles.length === 0) {
            console.log('⚠️  No migration files found.');
            await pool.end();
            return;
        }

        for (const file of migrationFiles) {
            const migrationPath = path.join(migrationsDir, file);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
            console.log(`📝 Executing migration: ${file}`);
            await pool.query(migrationSQL);
        }

        console.log('✓ All migrations executed successfully!\n');

        // Verify columns
        console.log('🔍 Verifying new columns:');
        const result = await pool.query(`
            SELECT 
                column_name,
                data_type
            FROM information_schema.columns
            WHERE table_name = 'tokens'
            AND column_name IN ('marketcap', 'volume_24h', 'price_change_5m', 'price_change_1h', 'price_change_6h', 'trader_count', 'price_snapshot_time', 'price_snapshot_value')
            ORDER BY ordinal_position;
        `);

        if (result.rows.length === 0) {
            console.log('⚠️  No new columns found. Columns may already exist or migration failed.');
        } else {
            result.rows.forEach((row) => {
                console.log(`  ✓ ${row.column_name} (${row.data_type})`);
            });
            console.log(`\n✅ Total new columns: ${result.rows.length}`);
        }

        await pool.end();
        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Error running migration:', error);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
