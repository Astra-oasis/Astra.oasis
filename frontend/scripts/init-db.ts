import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function initializeDatabase() {
    try {
        // Read schema.sql
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        // Execute schema
        await pool.query(schema);
        console.log('✓ Database schema initialized successfully');

        // Verify tables were created
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log('✓ Created tables:');
        result.rows.forEach((row) => {
            console.log(`  - ${row.table_name}`);
        });

        await pool.end();
    } catch (error) {
        console.error('✗ Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
