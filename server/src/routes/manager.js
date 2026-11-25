const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { rejectOperatorKeys } = require('../middleware/sanitizeInput');
const messageLimiter = require('../middleware/messageLimiter');
const {
  getOverview,
  listFarmers,
  getFarmer,
  unlinkDevice,
  listConversations,
  getFarmerMessages,
  sendFarmerMessage,
  markFarmerMessagesRead,
  getManagerUnreadCount
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
router.get('/conversations', listConversations);
router.get('/farmers/:farmerId/messages', getFarmerMessages);
router.post('/farmers/:farmerId/messages', messageLimiter, sendFarmerMessage);
router.post('/farmers/:farmerId/messages/read', markFarmerMessagesRead);
router.get('/messages/unread-count', getManagerUnreadCount);

module.exports = router;
