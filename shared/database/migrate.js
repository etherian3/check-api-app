require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🔄 Running database migration...');
        const schemaSQL = fs.readFileSync(
            path.resolve(__dirname, 'schema.sql'),
            'utf-8'
        );
        await pool.query(schemaSQL);
        console.log('✅ Migration complete! Tables created: apis, api_checks');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
