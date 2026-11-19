const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { updateProfile, changePassword, updateDeviceNickname } = require('../controllers/profileController');

const router = express.Router();

router.patch('/', requireAuth, updateProfile);
router.post('/password', requireAuth, changePassword);
router.patch('/devices/:deviceId', requireAuth, updateDeviceNickname);

module.exports = router;
