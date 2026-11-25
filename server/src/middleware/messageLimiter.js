const rateLimit = require('express-rate-limit');

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => (req.user && req.user._id ? req.user._id.toString() : req.ip),
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many messages sent, please wait a minute.',
      status: 429
    }
  }
});

module.exports = messageLimiter;
