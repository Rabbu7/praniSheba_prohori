const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getOverview,
  listFarmers,
  getFarmer
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
router.get('/device-requests', listManagerRequests);
router.post('/device-requests/:id/approve', approveRequest);
router.post('/device-requests/:id/reject', rejectRequest);

module.exports = router;
