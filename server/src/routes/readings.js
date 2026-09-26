const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();
const {
	getLatest,
	getHistory,
	getDailyAverages,
	getLog,
	getCalendar,
	getDay
} = require('../controllers/readingsController');

const requireDevice = (req, res, next) => {
	if (!req.user.device || !req.user.device.deviceId) {
		return res.status(403).json({
			error: {
				message: 'No device linked',
				status: 403
			}
		});
	}

	return next();
};

// GET /api/readings/latest
router.get('/latest', requireAuth, requireDevice, getLatest);

// GET /api/readings/history
router.get('/history', requireAuth, requireDevice, getHistory);

// GET /api/readings/daily-averages
router.get('/daily-averages', requireAuth, requireDevice, getDailyAverages);

// GET /api/readings/log
router.get('/log', requireAuth, requireDevice, getLog);

// GET /api/readings/calendar
router.get('/calendar', requireAuth, requireDevice, getCalendar);

// GET /api/readings/day/:date
router.get('/day/:date', requireAuth, requireDevice, getDay);

module.exports = router;
