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

    // TODO(revert-for-production): TEMPORARY DEMO LOGIC — anchors the 7d/30d window to the latest reading's
    // own timestamp instead of the current wall-clock time, so historical/stale
    // demo data still populates the chart and table. Revert to Date.now()-based
    // cutoff once the device is actively writing fresh data. See AGENTS.md.
    const latestDoc = await Reading.findOne().sort({ created_at: -1 }).select('created_at').lean();
    const anchorTime = latestDoc ? new Date(latestDoc.created_at).getTime() : Date.now();
    const cutoffDate = new Date(anchorTime - days * 24 * 60 * 60 * 1000);
    const readings = await Reading.find({ created_at: { $gte: cutoffDate } })
      .sort({ created_at: 1 })
      .lean();

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
