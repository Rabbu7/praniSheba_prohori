const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  createDeviceRequest,
  listMine
} = require('../controllers/deviceRequestController');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

router.post('/', createDeviceRequest);
router.get('/mine', listMine);

module.exports = router;
