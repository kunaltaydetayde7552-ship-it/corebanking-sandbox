const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter for general API routes:
 * 100 requests per 15-minute window per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});

/**
 * Stricter rate limiter for sensitive operations:
 * Auth endpoints, transfers, withdrawals, admin actions:
 * 30 requests per 15-minute window per IP
 */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests for sensitive operations, please try again later.'
    });
  }
});

module.exports = {
  apiLimiter,
  sensitiveLimiter
};
