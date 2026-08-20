const express = require('express');
const router = express.Router();
const { getLatest, getHistory } = require('../controllers/readingsController');

// GET /api/readings/latest
router.get('/latest', getLatest);

// GET /api/readings/history
router.get('/history', getHistory);

module.exports = router;
