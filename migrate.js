#!/usr/bin/env node
/**
 * DB Migration: Add method/headers/body/expected_status columns to apis table
 * Run: node migrate.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    console.log('🔄 Running migration...');
    const client = await pool.connect();
    try {
        await client.query(`
            ALTER TABLE apis
              ADD COLUMN IF NOT EXISTS method VARCHAR(10) NOT NULL DEFAULT 'GET',
              ADD COLUMN IF NOT EXISTS headers JSONB,
              ADD COLUMN IF NOT EXISTS body TEXT,
              ADD COLUMN IF NOT EXISTS expected_status INTEGER;
        `);
        console.log('✅ Migration complete! New columns added: method, headers, body, expected_status');

        // Show result
        const res = await client.query(
            `SELECT column_name, data_type, column_default 
             FROM information_schema.columns 
             WHERE table_name='apis' 
             ORDER BY ordinal_position`
        );
        console.log('\nCurrent apis table schema:');
        console.table(res.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
