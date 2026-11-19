const express = require('express');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const {
  register,
  login,
  me
} = require('../controllers/authController');

const router = express.Router();

function createAuthLimiter(maxEnvName, defaultMax) {
  const parsed = Number.parseInt(process.env[maxEnvName] || '', 10);
  const limit = Number.isInteger(parsed) && parsed > 0 ? parsed : defaultMax;

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        status: 429
      }
    }
  });
}

const loginLimiter = createAuthLimiter('LOGIN_RATE_LIMIT_MAX', 10);
const registerLimiter = createAuthLimiter('REGISTER_RATE_LIMIT_MAX', 10);

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, me);

module.exports = router;
