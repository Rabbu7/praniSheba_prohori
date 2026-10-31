const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const {
  getOverview,
  listManagers,
  createManager,
  deleteManager
} = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', getOverview);
router.get('/managers', listManagers);
router.post('/managers', createManager);
router.delete('/managers/:id', deleteManager);

module.exports = router;
