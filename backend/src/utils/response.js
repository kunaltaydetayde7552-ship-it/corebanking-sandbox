/**
 * Utility functions for standardized API responses
 */

/**
 * Formats a successful response
 * @param {object} res Express response object
 * @param {any} data Response payload
 * @param {string} message Human readable message
 * @param {number} statusCode HTTP status code (default 200)
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Formats an error response
 * @param {object} res Express response object
 * @param {string} message Error message
 * @param {number} statusCode HTTP status code (default 400)
 * @param {any} errors Optional validation errors or details
 */
const errorResponse = (res, message = 'Bad Request', statusCode = 400, errors = null) => {
  const payload = {
    success: false,
    message
  };
  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Formats a paginated response
 * @param {object} res Express response object
 * @param {Array} data Array of items for current page
 * @param {number} page Current page index (1-based)
 * @param {number} limit Number of items per page
 * @param {number} total Total count of items
 * @param {string} message Human readable message
 */
const paginatedResponse = (res, data = [], page = 1, limit = 10, total = 0, message = 'Success') => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const parsedTotal = Math.max(0, parseInt(total, 10) || 0);
  const totalPages = Math.ceil(parsedTotal / parsedLimit) || (parsedTotal === 0 ? 0 : 1);

  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total: parsedTotal,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1
    }
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
