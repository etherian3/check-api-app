const rateLimit = require('express-rate-limit');

// Skip rate limit for SSE stream (long-lived connection that would eat up the budget)
const skip = (req) => req.path === '/stream';

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,                 // allow plenty of requests for normal usage
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    message: { error: 'Too many requests, please try again later.' },
});

module.exports = { rateLimiter };

