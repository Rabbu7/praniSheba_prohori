const express = require('express');
const router = express.Router();
const {
	getLatest,
	getHistory,
	getDailyAverages,
	getLog
} = require('../controllers/readingsController');

// GET /api/readings/latest
router.get('/latest', getLatest);

// GET /api/readings/history
router.get('/history', getHistory);

// GET /api/readings/daily-averages
router.get('/daily-averages', getDailyAverages);

// GET /api/readings/log
router.get('/log', getLog);

module.exports = router;
