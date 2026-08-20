/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] Status: ${status}, Message: ${message}`);

  res.status(status).json({
    error: {
      message,
      status
    }
  });
};

module.exports = errorHandler;
