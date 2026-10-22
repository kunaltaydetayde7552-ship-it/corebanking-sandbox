const { errorResponse } = require('../utils/response');

/**
 * Centralized Safe Error Handling Middleware
 * Logs errors internally for observability while sanitizing client-facing responses
 * to prevent stack trace or database error disclosure.
 */
const errorHandler = (err, req, res, next) => {
  // 1. Internal Logging
  console.error(`[Security/Error] ${req.method} ${req.originalUrl}:`, err);

  // 2. Handle CORS errors
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation: Access from origin not allowed.'
    });
  }

  // 3. Determine status code
  const statusCode = err.statusCode || (err.status || 500);

  // 4. Sanitize error message for client
  let clientMessage = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    clientMessage = 'An unexpected internal server error occurred. Please try again later.';
  } else {
    // For client errors (4xx), ensure no database internals or SQL fragments leak
    if (
      typeof clientMessage === 'string' &&
      (clientMessage.includes('SELECT ') ||
        clientMessage.includes('INSERT ') ||
        clientMessage.includes('syntax error') ||
        clientMessage.includes('pg_') ||
        clientMessage.includes('relation "') ||
        clientMessage.includes('at '))
    ) {
      clientMessage = 'A database operation failed validation.';
    }
  }

  return errorResponse(res, clientMessage, statusCode, err.errors || null);
};

module.exports = errorHandler;
