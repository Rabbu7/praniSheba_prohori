const logger = require('../utils/logger');
const { defaultCodeForStatus } = require('../utils/errors');

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, _next) => {
  const status = err.statusCode || err.status || (err.type === 'entity.too.large' ? 413 : 500);
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  const code = typeof err.code === 'string' && err.code.trim()
    ? err.code
    : defaultCodeForStatus(status);

  logger.error('http_error', {
    status,
    code,
    message: err.message || 'Internal Server Error',
    method: req?.method,
    path: req?.originalUrl?.split('?')[0]
  });

  res.status(status).json({
    error: {
      code,
      message,
      status
    }
  });
};

module.exports = errorHandler;
