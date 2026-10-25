const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { updateProfile, changePassword } = require('../controllers/profileController');

const router = express.Router();

router.patch('/', requireAuth, updateProfile);
router.post('/password', requireAuth, changePassword);

module.exports = router;
