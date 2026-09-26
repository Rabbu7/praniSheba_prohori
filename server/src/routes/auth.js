const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  register,
  login,
  me,
  linkDevice
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/link-device', requireAuth, linkDevice);

module.exports = router;
