const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Active SSE connections
const clients = new Set();

/**
 * Fetch all live data in one shot
 */
async function getLivePayload() {
    const [overview, activity, categories] = await Promise.all([
        query(`
      WITH latest_checks AS (
        SELECT DISTINCT ON (api_id) api_id, success, latency_ms, checked_at
        FROM api_checks ORDER BY api_id, checked_at DESC
      )
      SELECT
        (SELECT COUNT(*) FROM apis) AS total_apis,
        (SELECT COUNT(*) FROM api_checks) AS total_checks,
        (SELECT COUNT(*) FROM latest_checks WHERE success = true)  AS up_count,
        (SELECT COUNT(*) FROM latest_checks WHERE success = false) AS down_count,
        (SELECT COUNT(*) FROM apis WHERE id NOT IN (SELECT DISTINCT api_id FROM api_checks)) AS unknown_count,
        (SELECT ROUND(AVG(latency_ms)) FROM latest_checks WHERE success = true) AS avg_latency_ms
    `),
        query(`
      SELECT ac.id, ac.api_id, ac.success, ac.status_code, ac.latency_ms,
             ac.error_message, ac.checked_at, a.name AS api_name, a.category
      FROM api_checks ac
      JOIN apis a ON a.id = ac.api_id
      ORDER BY ac.checked_at DESC
      LIMIT 20
    `),
        query(`
      WITH latest_checks AS (
        SELECT DISTINCT ON (api_id) api_id, success
        FROM api_checks ORDER BY api_id, checked_at DESC
      )
      SELECT a.category,
        COUNT(DISTINCT a.id) AS total,
        COUNT(DISTINCT CASE WHEN lc.success = true  THEN a.id END) AS up,
        COUNT(DISTINCT CASE WHEN lc.success = false THEN a.id END) AS down
      FROM apis a
      LEFT JOIN latest_checks lc ON lc.api_id = a.id
      WHERE a.category IS NOT NULL
      GROUP BY a.category ORDER BY total DESC LIMIT 12
    `),
    ]);

    return {
        overview: overview.rows[0],
        activity: activity.rows,
        categories: categories.rows,
        timestamp: new Date().toISOString(),
    };
}

// Broadcast to all connected clients
async function broadcast() {
    if (clients.size === 0) return;
    try {
        const payload = await getLivePayload();
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        clients.forEach(res => {
            try { res.write(data); } catch { clients.delete(res); }
        });
    } catch (err) {
        console.error('[SSE] Broadcast error:', err.message);
    }
}

// Broadcast every 5 seconds
setInterval(broadcast, 5000);

// ─── GET /api/stream ─────────────────────────────────────────────────────────
router.get('/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    clients.add(res);
    console.log(`[SSE] Client connected. Total: ${clients.size}`);

    // Send initial snapshot immediately
    try {
        const payload = await getLivePayload();
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch { /* db not ready yet */ }

    // Heartbeat every 20s to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 20000);

    req.on('close', () => {
        clients.delete(res);
        clearInterval(heartbeat);
        console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
    });
});

module.exports = router;
