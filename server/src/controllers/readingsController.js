const Reading = require('../models/Reading');
const { getZones } = require('../utils/thresholds');

/**
 * Fetch the single most recent reading, attach metric zones, and return
 * GET /api/readings/latest
 */
const getLatest = async (req, res, next) => {
  try {
    const reading = await Reading.findOne().sort({ created_at: -1 }).lean();

    if (!reading) {
      return res.status(404).json({
        error: {
          message: 'No readings found',
          status: 404
        }
      });
    }

    const zones = getZones(reading);
    return res.json({
      ...reading,
      ...zones
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch readings history by date range (7d or 30d), attach zones, and return sorted ascending
 * GET /api/readings/history?range=7d|30d
 */
const getHistory = async (req, res, next) => {
  try {
    const { range } = req.query;
    let days = 7;

    if (range === '30d') {
      days = 30;
    } else if (range === '7d' || !range) {
      days = 7;
    } else {
      // Default safely to 7d for invalid range parameters
      days = 7;
    }

    // TEMPORARY DEMO LOGIC — the seeded dataset is bursty (long gaps between
    // logging sessions), so a literal 7/30-DAY time window often captures only
    // a few minutes of real data. Using a document count instead guarantees a
    // continuous, demo-friendly trend regardless of real gaps in the data.
    // Revert to a true time-window cutoff once the device logs continuously.
    // See AGENTS.md > Known Temporary Workarounds.
    const COUNT_BY_RANGE = { '7d': 300, '30d': 1200 };
    const limit = COUNT_BY_RANGE[days === 30 ? '30d' : '7d'];

    const readings = await Reading.find()
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
    readings.reverse();

    const result = readings.map((reading) => ({
      ...reading,
      ...getZones(reading)
    }));

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLatest,
  getHistory
};
