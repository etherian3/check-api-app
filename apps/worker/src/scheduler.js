require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { monitoringQueue } = require('./queue');
const { query } = require('./db');

const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 60000;

/**
 * Fetch all APIs from DB and enqueue a monitoring job for each
 */
async function scheduleChecks() {
    try {
        const result = await query('SELECT id, name, base_url FROM apis ORDER BY id');
        const apis = result.rows;

        if (apis.length === 0) {
            console.log('[Scheduler] No APIs found. Import APIs first via POST /api/import-apis');
            return;
        }

        console.log(`[Scheduler] Enqueueing ${apis.length} API check jobs...`);

        for (const api of apis) {
            await monitoringQueue.add(
                `check-api-${api.id}`,
                { apiId: api.id, baseUrl: api.base_url, name: api.name },
                {
                    attempts: 1,
                    removeOnComplete: { count: 100 },
                    removeOnFail: { count: 50 },
                }
            );
        }

        console.log(`[Scheduler] ✅ Enqueued ${apis.length} jobs at ${new Date().toISOString()}`);
    } catch (err) {
        console.error('[Scheduler] Error scheduling checks:', err.message);
    }
}

function startScheduler() {
    console.log(`[Scheduler] Starting — check interval: ${CHECK_INTERVAL / 1000}s`);

    // Run immediately on startup
    scheduleChecks();

    // Then repeat at interval
    const timer = setInterval(scheduleChecks, CHECK_INTERVAL);

    // Graceful shutdown
    process.on('SIGTERM', () => {
        clearInterval(timer);
        console.log('[Scheduler] Stopped.');
    });
}

module.exports = { startScheduler };
