const express = require('express');
const { LOCATIONS } = require('../utils/locations');
const { THRESHOLDS } = require('../utils/thresholds');

const router = express.Router();

router.get('/locations', (req, res) => res.json(LOCATIONS));
router.get('/thresholds', (req, res) => res.json(THRESHOLDS));

module.exports = router;
