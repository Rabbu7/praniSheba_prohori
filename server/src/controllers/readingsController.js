const { getReadingModel } = require('../models/Reading');
const { getZones } = require('../utils/thresholds');
const {
  DHAKA_TZ,
  getWindowStart,
  getDhakaMonthBounds,
  getDhakaDayBounds
} = require('../utils/dhakaTime');

/**
 * Fetch the single most recent reading, attach metric zones, and return
 * GET /api/readings/latest
 */
const getLatest = async (req, res, next) => {
  try {
    const Reading = getReadingModel(req.deviceId);
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
 * Fetch readings for the last 7 or 30 Asia/Dhaka days (window starts at Dhaka
 * midnight), attach zones, and return sorted ascending.
 * GET /api/readings/history?range=7d|30d
 */
const getHistory = async (req, res, next) => {
  try {
    const Reading = getReadingModel(req.deviceId);
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

    const readings = await Reading.find({ created_at: { $gte: getWindowStart(days) } })
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

/**
 * Fetch daily averages (grouped by Asia/Dhaka day) for the last 7 or 30 Dhaka
 * days and classify each averaged metric.
 * GET /api/readings/daily-averages?range=7d|30d
 */
const getDailyAverages = async (req, res, next) => {
  try {
    const Reading = getReadingModel(req.deviceId);
    const { range } = req.query;
    const days = range === '30d' ? 30 : 7;

    const averages = await Reading.aggregate([
      { $match: { created_at: { $gte: getWindowStart(days) } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$created_at',
              timezone: DHAKA_TZ
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
    const Reading = getReadingModel(req.deviceId);
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
          date: '$created_at',
          timezone: DHAKA_TZ
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

/**
 * Fetch daily minimums and maximums for an Asia/Dhaka calendar month.
 * GET /api/readings/calendar?month=YYYY-MM
 */
const getCalendar = async (req, res, next) => {
  try {
    const Reading = getReadingModel(req.deviceId);
    const { start, end } = getDhakaMonthBounds(req.query.month);

    const days = await Reading.aggregate(getMinMaxPipeline(start, end));
    return res.json(days.map(formatMinMaxReading));
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch daily minimums and maximums for one Asia/Dhaka calendar day.
 * GET /api/readings/day/:date
 */
const getDay = async (req, res, next) => {
  try {
    const Reading = getReadingModel(req.deviceId);
    const bounds = getDhakaDayBounds(req.params.date);

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
