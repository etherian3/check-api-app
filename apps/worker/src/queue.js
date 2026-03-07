require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const monitoringQueue = new Queue('api-monitoring', { connection });

module.exports = { monitoringQueue, connection };
