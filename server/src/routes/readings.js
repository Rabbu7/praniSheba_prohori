const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const resolveDevice = require('../middleware/resolveDevice');
const router = express.Router();
const {
	getLatest,
	getDailyAverages,
	getLog,
	getCalendar,
	getDay,
	exportCsv
} = require('../controllers/readingsController');

// GET /api/readings/latest
router.get('/latest', requireAuth, resolveDevice, getLatest);

// GET /api/readings/daily-averages
router.get('/daily-averages', requireAuth, resolveDevice, getDailyAverages);

// GET /api/readings/log
router.get('/log', requireAuth, resolveDevice, getLog);

// GET /api/readings/export
router.get('/export', requireAuth, resolveDevice, exportCsv);

// GET /api/readings/calendar
router.get('/calendar', requireAuth, resolveDevice, getCalendar);

// GET /api/readings/day/:date
router.get('/day/:date', requireAuth, resolveDevice, getDay);

module.exports = router;
