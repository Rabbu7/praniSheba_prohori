const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { rejectOperatorKeys } = require('../middleware/sanitizeInput');
const messageLimiter = require('../middleware/messageLimiter');
const {
  getMessages,
  sendMessage,
  markMessagesRead,
  getUnreadCount
} = require('../controllers/messagesController');

const router = express.Router();
router.use(requireAuth, requireRole('farmer'));

router.get('/', rejectOperatorKeys, getMessages);
router.post('/', messageLimiter, sendMessage);
router.post('/read', markMessagesRead);
router.get('/unread-count', getUnreadCount);

module.exports = router;
