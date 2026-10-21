const morgan = require('morgan');

/**
 * Request logging middleware using morgan 'dev' format
 */
const requestLogger = morgan('dev');

module.exports = requestLogger;
