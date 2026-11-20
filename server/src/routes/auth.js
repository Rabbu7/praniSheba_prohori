const express = require('express');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const {
  register,
  login,
  me
} = require('../controllers/authController');

const router = express.Router();

// Note: app.set('trust proxy', ...) must be configured in the deployment phase
// so express-rate-limit identifies client IPs behind a reverse proxy.
function createAuthLimiter(maxEnvName, defaultMax, options = {}) {
  const parsed = Number.parseInt(process.env[maxEnvName] || '', 10);
  const limit = Number.isInteger(parsed) && parsed > 0 ? parsed : defaultMax;

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        status: 429
      }
    }
  });
}

const loginLimiter = createAuthLimiter('LOGIN_RATE_LIMIT_MAX', 10, { skipSuccessfulRequests: true });
const registerLimiter = createAuthLimiter('REGISTER_RATE_LIMIT_MAX', 10);

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);

module.exports = router;
