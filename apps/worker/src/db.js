require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error('[Worker DB Error]', err.message);
        throw err;
    }
}

module.exports = { pool, query };
