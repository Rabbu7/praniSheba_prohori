const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { rejectOperatorKeys } = require('../middleware/sanitizeInput');
const {
  getOverview,
  listFarmers,
  getFarmer,
  unlinkDevice
} = require('../controllers/managerController');
const {
  listManagerRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/deviceRequestController');

const router = express.Router();
router.use(requireAuth, requireRole('manager'));

router.get('/overview', getOverview);
router.get('/farmers', listFarmers);
router.get('/farmers/:farmerId', getFarmer);
router.delete('/farmers/:farmerId/devices/:deviceId', unlinkDevice);
router.get('/device-requests', rejectOperatorKeys, listManagerRequests);
router.post('/device-requests/:id/approve', approveRequest);
router.post('/device-requests/:id/reject', rejectRequest);

module.exports = router;
