const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { importApis } = require('../services/importer');

// ─── GET /api/apis ───────────────────────────────────────────────────────────
// Returns all APIs with latest status, uptime %, avg latency
// Supports: ?search=, ?category=, ?page=, ?limit=
router.get('/apis', async (req, res) => {
    try {
        const { search = '', category = '', page = 1, limit = 30 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const filters = [];
        const params = [];
        let paramIndex = 1;

        if (search) {
            filters.push(`(a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (category) {
            filters.push(`a.category = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        const apisResult = await query(
            `SELECT
        a.id,
        a.name,
        a.description,
        a.category,
        a.auth_required,
        a.https_supported,
        a.base_url,
        a.created_at,
        COUNT(ac.id) AS total_checks,
        SUM(CASE WHEN ac.success = true THEN 1 ELSE 0 END) AS successful_checks,
        ROUND(AVG(ac.latency_ms)) AS avg_latency_ms,
        (SELECT ac2.success FROM api_checks ac2 WHERE ac2.api_id = a.id ORDER BY ac2.checked_at DESC LIMIT 1) AS last_status,
        (SELECT ac2.checked_at FROM api_checks ac2 WHERE ac2.api_id = a.id ORDER BY ac2.checked_at DESC LIMIT 1) AS last_checked_at
      FROM apis a
      LEFT JOIN api_checks ac ON ac.api_id = a.id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, parseInt(limit), offset]
        );

        // Count total for pagination
        const countResult = await query(
            `SELECT COUNT(*) FROM apis a ${whereClause}`,
            params
        );

        const total = parseInt(countResult.rows[0].count);
        const apis = apisResult.rows.map(row => ({
            ...row,
            uptime_percentage:
                row.total_checks > 0
                    ? parseFloat(((row.successful_checks / row.total_checks) * 100).toFixed(2))
                    : null,
            current_status:
                row.last_status === true ? 'UP' :
                    row.last_status === false ? 'DOWN' : 'UNKNOWN',
        }));

        res.json({
            data: apis,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                total_pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error('[GET /apis]', err);
        res.status(500).json({ error: 'Failed to fetch APIs' });
    }
});

// ─── GET /api/apis/categories ─────────────────────────────────────────────────
router.get('/apis/categories', async (req, res) => {
    try {
        const result = await query(
            'SELECT DISTINCT category FROM apis WHERE category IS NOT NULL ORDER BY category'
        );
        res.json({ categories: result.rows.map(r => r.category) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ─── GET /api/apis/:id ───────────────────────────────────────────────────────
router.get('/apis/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM apis WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch API' });
    }
});

// ─── GET /api/apis/:id/stats ─────────────────────────────────────────────────
router.get('/apis/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Check API exists
        const apiResult = await query('SELECT id, name FROM apis WHERE id = $1', [id]);
        if (apiResult.rows.length === 0) {
            return res.status(404).json({ error: 'API not found' });
        }

        const statsResult = await query(
            `SELECT
        COUNT(*) AS total_checks,
        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) AS successful_checks,
        SUM(CASE WHEN success = false THEN 1 ELSE 0 END) AS failed_checks,
        ROUND(AVG(latency_ms)) AS avg_latency_ms,
        MIN(latency_ms) AS min_latency_ms,
        MAX(latency_ms) AS max_latency_ms,
        MAX(checked_at) AS last_checked_at
      FROM api_checks
      WHERE api_id = $1`,
            [id]
        );

        const stats = statsResult.rows[0];
        const totalChecks = parseInt(stats.total_checks) || 0;
        const successfulChecks = parseInt(stats.successful_checks) || 0;
        const failedChecks = parseInt(stats.failed_checks) || 0;

        res.json({
            api_id: parseInt(id),
            total_checks: totalChecks,
            successful_checks: successfulChecks,
            failed_checks: failedChecks,
            uptime_percentage: totalChecks > 0
                ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2))
                : null,
            error_rate: totalChecks > 0
                ? parseFloat(((failedChecks / totalChecks) * 100).toFixed(2))
                : null,
            avg_latency_ms: stats.avg_latency_ms ? parseInt(stats.avg_latency_ms) : null,
            min_latency_ms: stats.min_latency_ms ? parseInt(stats.min_latency_ms) : null,
            max_latency_ms: stats.max_latency_ms ? parseInt(stats.max_latency_ms) : null,
            last_checked_at: stats.last_checked_at,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── GET /api/apis/:id/history ───────────────────────────────────────────────
router.get('/apis/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const apiResult = await query('SELECT id FROM apis WHERE id = $1', [id]);
        if (apiResult.rows.length === 0) {
            return res.status(404).json({ error: 'API not found' });
        }

        const historyResult = await query(
            `SELECT id, api_id, status_code, latency_ms, success, error_message, checked_at
       FROM api_checks
       WHERE api_id = $1
       ORDER BY checked_at DESC
       LIMIT $2 OFFSET $3`,
            [id, parseInt(limit), offset]
        );

        const countResult = await query(
            'SELECT COUNT(*) FROM api_checks WHERE api_id = $1',
            [id]
        );

        res.json({
            data: historyResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                total_pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ─── POST /api/import-apis ───────────────────────────────────────────────────
router.post('/import-apis', async (req, res) => {
    try {
        console.log('[POST /import-apis] Starting import...');
        const result = await importApis();
        res.json({
            message: 'Import completed successfully',
            ...result,
        });
    } catch (err) {
        console.error('[POST /import-apis]', err);
        res.status(500).json({ error: 'Import failed', message: err.message });
    }
});

// ─── GET /api/stats/overview ──────────────────────────────────────────────────
// Counts unique APIs by their LATEST check result (not all checks)
router.get('/stats/overview', async (req, res) => {
    try {
        const result = await query(`
      WITH latest_checks AS (
        SELECT DISTINCT ON (api_id)
          api_id, success, latency_ms, checked_at
        FROM api_checks
        ORDER BY api_id, checked_at DESC
      )
      SELECT
        (SELECT COUNT(*) FROM apis) AS total_apis,
        (SELECT COUNT(*) FROM api_checks) AS total_checks,
        (SELECT COUNT(*) FROM latest_checks WHERE success = true)  AS up_count,
        (SELECT COUNT(*) FROM latest_checks WHERE success = false) AS down_count,
        (SELECT COUNT(*) FROM apis WHERE id NOT IN (SELECT DISTINCT api_id FROM api_checks)) AS unknown_count,
        (SELECT ROUND(AVG(latency_ms)) FROM latest_checks WHERE success = true) AS avg_latency_ms
    `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch overview stats' });
    }
});

// ─── GET /api/stats/recent-activity ──────────────────────────────────────────
// Last 20 check events across all APIs
router.get('/stats/recent-activity', async (req, res) => {
    try {
        const result = await query(`
      SELECT ac.id, ac.api_id, ac.success, ac.status_code, ac.latency_ms,
             ac.error_message, ac.checked_at, a.name AS api_name, a.category
      FROM api_checks ac
      JOIN apis a ON a.id = ac.api_id
      ORDER BY ac.checked_at DESC
      LIMIT 20
    `);
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});

// ─── GET /api/stats/categories ────────────────────────────────────────────────
// Per-category uptime summary
router.get('/stats/categories', async (req, res) => {
    try {
        const result = await query(`
      WITH latest_checks AS (
        SELECT DISTINCT ON (api_id)
          api_id, success
        FROM api_checks
        ORDER BY api_id, checked_at DESC
      )
      SELECT
        a.category,
        COUNT(DISTINCT a.id) AS total,
        COUNT(DISTINCT CASE WHEN lc.success = true  THEN a.id END) AS up,
        COUNT(DISTINCT CASE WHEN lc.success = false THEN a.id END) AS down
      FROM apis a
      LEFT JOIN latest_checks lc ON lc.api_id = a.id
      WHERE a.category IS NOT NULL
      GROUP BY a.category
      ORDER BY total DESC
      LIMIT 12
    `);
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch category stats' });
    }
});

module.exports = router;

