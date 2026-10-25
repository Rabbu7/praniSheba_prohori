const express = require('express');
const { LOCATIONS } = require('../utils/locations');

const router = express.Router();

router.get('/locations', (req, res) => res.json(LOCATIONS));

module.exports = router;
