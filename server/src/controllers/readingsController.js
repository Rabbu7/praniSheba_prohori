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

const roundToOneDecimal = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const getMinMaxPipeline = (start, end) => [
  {
    $match: {
      created_at: {
        $gte: start,
        $lt: end
      }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$created_at'
        }
      },
      ammonia_min: { $min: '$ammonia' },
      ammonia_max: { $max: '$ammonia' },
      methane_min: { $min: '$methane' },
      methane_max: { $max: '$methane' },
      humidity_min: { $min: '$humidity' },
      humidity_max: { $max: '$humidity' },
      temperature_min: { $min: '$temperature' },
      temperature_max: { $max: '$temperature' }
    }
  },
  { $sort: { _id: 1 } }
];

const formatMinMaxReading = (average) => {
  const minimums = {
    ammonia: roundToOneDecimal(average.ammonia_min),
    methane: roundToOneDecimal(average.methane_min),
    humidity: roundToOneDecimal(average.humidity_min),
    temperature: roundToOneDecimal(average.temperature_min)
  };
  const maximums = {
    ammonia: roundToOneDecimal(average.ammonia_max),
    methane: roundToOneDecimal(average.methane_max),
    humidity: roundToOneDecimal(average.humidity_max),
    temperature: roundToOneDecimal(average.temperature_max)
  };
  const minimumZones = getZones(minimums);
  const maximumZones = getZones(maximums);

  return {
    date: average._id,
    ammonia_min: minimums.ammonia,
    ammonia_max: maximums.ammonia,
    ammonia_min_zone: minimumZones.ammonia_zone,
    ammonia_max_zone: maximumZones.ammonia_zone,
    methane_min: minimums.methane,
    methane_max: maximums.methane,
    methane_min_zone: minimumZones.methane_zone,
    methane_max_zone: maximumZones.methane_zone,
    humidity_min: minimums.humidity,
    humidity_max: maximums.humidity,
    humidity_min_zone: minimumZones.humidity_zone,
    humidity_max_zone: maximumZones.humidity_zone,
    temperature_min: minimums.temperature,
    temperature_max: maximums.temperature,
    temperature_min_zone: minimumZones.temperature_zone,
    temperature_max_zone: maximumZones.temperature_zone
  };
};

const getUtcMonthBounds = (month) => {
  const isValidMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '');
  // Invalid or missing months default to the current UTC month for consistency.
  const monthKey = isValidMonth
    ? month
    : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = monthKey.split('-').map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1))
  };
};

/**
 * Fetch daily minimums and maximums for a UTC calendar month.
 * GET /api/readings/calendar?month=YYYY-MM
 */
const getCalendar = async (req, res, next) => {
  try {
    const { start, end } = getUtcMonthBounds(req.query.month);

    // Grouping uses UTC calendar days, matching daily-averages; revisit timezone
    // handling for Bangladesh-based users when the date display is finalized.
    const days = await Reading.aggregate(getMinMaxPipeline(start, end));
    return res.json(days.map(formatMinMaxReading));
  } catch (error) {
    next(error);
  }
};

const getUtcDayBounds = (date) => {
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '');
  const parsedDate = isValidDate ? new Date(`${date}T00:00:00.000Z`) : null;
  const isRealDate = parsedDate && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date;

  if (!isRealDate) {
    return null;
  }

  return {
    start: parsedDate,
    end: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000)
  };
};

/**
 * Fetch daily minimums and maximums for one UTC calendar day.
 * GET /api/readings/day/:date
 */
const getDay = async (req, res, next) => {
  try {
    const bounds = getUtcDayBounds(req.params.date);

    if (!bounds) {
      return res.status(400).json({
        error: {
          message: 'Invalid date; expected YYYY-MM-DD',
          status: 400
        }
      });
    }

    const [day] = await Reading.aggregate(getMinMaxPipeline(bounds.start, bounds.end));

    if (!day) {
      return res.status(404).json({
        error: {
          message: 'No readings found for this date',
          status: 404
        }
      });
    }

    return res.json(formatMinMaxReading(day));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLatest,
  getHistory,
  getDailyAverages,
  getLog,
  getCalendar,
  getDay
};
