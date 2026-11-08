const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getAlerts,
  markAlertRead,
  markAllAlertsRead
} = require('../controllers/alertsController');

const router = express.Router();

router.use(requireAuth, requireRole('farmer', 'manager'));

router.get('/', getAlerts);
router.post('/read-all', markAllAlertsRead);
router.post('/:id/read', markAlertRead);

module.exports = router;

