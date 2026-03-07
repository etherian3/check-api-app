require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { monitoringQueue, connection } = require('./queue');
const { processMonitoringJob } = require('./processor');
const { startScheduler } = require('./scheduler');

const CONCURRENCY = 5; // Process up to 5 API checks in parallel

console.log('🚀 Capi Worker starting...');
console.log(`   Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log(`   DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@')}`);
console.log(`   Check interval: ${(parseInt(process.env.CHECK_INTERVAL) || 60000) / 1000}s`);
console.log(`   Concurrency: ${CONCURRENCY}`);

// Create the BullMQ worker
const worker = new Worker(
    'api-monitoring',
    processMonitoringJob,
    {
        connection,
        concurrency: CONCURRENCY,
    }
);

worker.on('completed', (job, result) => {
    // Logged by processor
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
});

// Start scheduler
startScheduler();

// Graceful shutdown
async function shutdown() {
    console.log('\n[Worker] Shutting down...');
    await worker.close();
    await connection.quit();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
