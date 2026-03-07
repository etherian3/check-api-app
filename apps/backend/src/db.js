require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected DB pool error:', err);
});

/**
 * Run a query against the database pool
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('[DB]', { text: text.substring(0, 60), duration, rows: res.rowCount });
        }
        return res;
    } catch (err) {
        console.error('[DB Error]', err.message);
        throw err;
    }
}

module.exports = { pool, query };
