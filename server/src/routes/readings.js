const express = require('express');
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
router.get('/latest', getLatest);

// GET /api/readings/history
router.get('/history', getHistory);

// GET /api/readings/daily-averages
router.get('/daily-averages', getDailyAverages);

// GET /api/readings/log
router.get('/log', getLog);

// GET /api/readings/calendar
router.get('/calendar', getCalendar);

// GET /api/readings/day/:date
router.get('/day/:date', getDay);

module.exports = router;
