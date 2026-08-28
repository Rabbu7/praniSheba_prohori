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

/**
 * Fetch daily averages for the requested range and classify each averaged metric.
 * GET /api/readings/daily-averages?range=7d|30d
 */
const getDailyAverages = async (req, res, next) => {
  try {
    const { range } = req.query;
    const rangeKey = range === '30d' ? '30d' : '7d';

    // TODO(revert-for-production): replace count-based windowing with a date cutoff
    // once the device logs continuously. See AGENTS.md > Known Temporary Workarounds.
    const COUNT_BY_RANGE = { '7d': 300, '30d': 1200 };
    const limit = COUNT_BY_RANGE[rangeKey];

    const averages = await Reading.aggregate([
      { $sort: { created_at: -1 } },
      { $limit: limit },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$created_at'
            }
          },
          ammonia_avg: { $avg: '$ammonia' },
          methane_avg: { $avg: '$methane' },
          humidity_avg: { $avg: '$humidity' },
          temperature_avg: { $avg: '$temperature' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = averages.map((average) => {
      const reading = {
        ammonia: Math.round((average.ammonia_avg + Number.EPSILON) * 10) / 10,
        methane: Math.round((average.methane_avg + Number.EPSILON) * 10) / 10,
        humidity: Math.round((average.humidity_avg + Number.EPSILON) * 10) / 10,
        temperature: Math.round((average.temperature_avg + Number.EPSILON) * 10) / 10
      };

      return {
        date: average._id,
        ammonia_avg: reading.ammonia,
        methane_avg: reading.methane,
        humidity_avg: reading.humidity,
        temperature_avg: reading.temperature,
        ...getZones(reading)
      };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch the unbounded reading log with pagination and metric zones.
 * GET /api/readings/log?page=1&limit=50
 */
const getLog = async (req, res, next) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 200)
      : 50;
    const skip = (page - 1) * limit;

    const [readings, total] = await Promise.all([
      Reading.find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reading.countDocuments()
    ]);

    const data = readings.map((reading) => ({
      ...reading,
      ...getZones(reading)
    }));

    return res.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLatest,
  getHistory,
  getDailyAverages,
  getLog
};
