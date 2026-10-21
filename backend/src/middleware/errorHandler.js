const { errorResponse } = require('../utils/response');

/**
 * Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error stack trace or message in console
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || (err.status || 500);
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode, err.errors || null);
};

module.exports = errorHandler;
