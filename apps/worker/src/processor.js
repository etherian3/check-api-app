const axios = require('axios');
const { query } = require('./db');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 10000;

/**
 * Process a single API monitoring job.
 * Job data: { apiId, baseUrl, name }
 */
async function processMonitoringJob(job) {
    const { apiId, baseUrl, name } = job.data;
    const start = Date.now();

    let statusCode = null;
    let latencyMs = null;
    let success = false;
    let errorMessage = null;

    try {
        const response = await axios.get(baseUrl, {
            timeout: REQUEST_TIMEOUT,
            validateStatus: () => true, // Don't throw on non-2xx
            headers: {
                'User-Agent': 'Capi-Monitor/1.0',
                'Accept': 'application/json, text/plain, */*',
            },
            maxRedirects: 5,
        });

        latencyMs = Date.now() - start;
        statusCode = response.status;
        success = statusCode >= 200 && statusCode < 400;

        if (!success) {
            errorMessage = `HTTP ${statusCode}`;
        }
    } catch (err) {
        latencyMs = Date.now() - start;

        if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
            errorMessage = 'Request timeout';
        } else if (err.code === 'ENOTFOUND') {
            errorMessage = 'DNS lookup failed';
        } else if (err.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused';
        } else if (err.code === 'ECONNRESET') {
            errorMessage = 'Connection reset';
        } else if (err.response) {
            statusCode = err.response.status;
            errorMessage = `HTTP ${statusCode}`;
        } else {
            errorMessage = err.message?.substring(0, 255) || 'Unknown error';
        }
    }

    // Save result to database
    await query(
        `INSERT INTO api_checks (api_id, status_code, latency_ms, success, error_message, checked_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
        [apiId, statusCode, latencyMs, success, errorMessage]
    );

    const status = success ? '✅' : '❌';
    console.log(`${status} [${name}] status=${statusCode ?? 'N/A'} latency=${latencyMs}ms${errorMessage ? ` error="${errorMessage}"` : ''}`);

    return { apiId, statusCode, latencyMs, success };
}

module.exports = { processMonitoringJob };
