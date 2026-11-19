const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getOverview,
  listManagers,
  createManager,
  deleteManager,
  restoreManager,
  resetManagerPassword,
  unlinkDevice
} = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', getOverview);
router.get('/managers', listManagers);
router.post('/managers', createManager);
router.delete('/managers/:id', deleteManager);
router.post('/managers/:id/restore', restoreManager);
router.post('/managers/:id/reset-password', resetManagerPassword);
router.delete('/farmers/:farmerId/devices/:deviceId', unlinkDevice);

module.exports = router;
