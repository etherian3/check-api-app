require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { monitoringQueue } = require('./queue');
const { query } = require('./db');

const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 60000;

/**
 * Clear any stale/old-format jobs from previous runs
 */
async function obliterateStaleJobs() {
    try {
        const counts = await monitoringQueue.getJobCounts();
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total > 0) {
            console.log(`[Scheduler] Clearing ${total} stale jobs from previous runs...`);
            await monitoringQueue.obliterate({ force: true });
            console.log('[Scheduler] ✅ Queue cleared');
        }
    } catch (err) {
        console.error('[Scheduler] Failed to obliterate queue:', err.message);
    }
}

/**
 * Fetch all APIs from DB and enqueue a monitoring job for each
 */
async function scheduleChecks() {
    try {
        const result = await query('SELECT id, name, base_url, method, headers, body, expected_status FROM apis ORDER BY id');
        const apis = result.rows;

        if (apis.length === 0) {
            console.log('[Scheduler] No APIs found. Add APIs via the dashboard first.');
            return;
        }

        console.log(`[Scheduler] Enqueueing ${apis.length} API check jobs...`);

        for (const api of apis) {
            await monitoringQueue.add(
                `check-api-${api.id}`,
                {
                    apiId: api.id,
                    baseUrl: api.base_url,
                    name: api.name,
                    method: api.method || 'GET',
                    headers: api.headers || null,
                    body: api.body || null,
                    expectedStatus: api.expected_status || null,
                },
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

async function startScheduler() {
    console.log(`[Scheduler] Starting — check interval: ${CHECK_INTERVAL / 1000}s`);

    // Clear stale jobs from old runs first
    await obliterateStaleJobs();

    // Run immediately on startup
    await scheduleChecks();

    // Then repeat at interval
    const timer = setInterval(scheduleChecks, CHECK_INTERVAL);

    // Graceful shutdown
    process.on('SIGTERM', () => {
        clearInterval(timer);
        console.log('[Scheduler] Stopped.');
    });
}

module.exports = { startScheduler };
