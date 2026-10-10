const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const resolveDevice = require('../middleware/resolveDevice');
const router = express.Router();
const {
	getLatest,
	getHistory,
	getDailyAverages,
	getLog,
	getCalendar,
	getDay
} = require('../controllers/readingsController');

// GET /api/readings/latest
router.get('/latest', requireAuth, resolveDevice, getLatest);

// GET /api/readings/history
router.get('/history', requireAuth, resolveDevice, getHistory);

// GET /api/readings/daily-averages
router.get('/daily-averages', requireAuth, resolveDevice, getDailyAverages);

// GET /api/readings/log
router.get('/log', requireAuth, resolveDevice, getLog);

// GET /api/readings/calendar
router.get('/calendar', requireAuth, resolveDevice, getCalendar);

// GET /api/readings/day/:date
router.get('/day/:date', requireAuth, resolveDevice, getDay);

module.exports = router;
