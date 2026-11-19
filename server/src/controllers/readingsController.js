const { getReadingModel } = require('../models/Reading');
const { getZones } = require('../utils/thresholds');
const {
  DHAKA_TZ,
  toDhakaShifted,
  getWindowStart,
  getDhakaMonthBounds,
  getDhakaDayBounds
} = require('../utils/dhakaTime');

const MAX_EXPORT_ROWS = 5000;

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
          code: 'NO_READINGS_FOUND',
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
          code: 'INVALID_DATE',
          message: 'Invalid date; expected YYYY-MM-DD',
          status: 400
        }
      });
    }

    const [day] = await Reading.aggregate(getMinMaxPipeline(bounds.start, bounds.end));

    if (!day) {
      return res.status(404).json({
        error: {
          code: 'NO_READINGS_FOR_DATE',
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

function formatCsvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  let str = String(value);
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export readings in a required Asia/Dhaka date range as CSV (row-capped).
 * GET /api/readings/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
const exportCsv = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (typeof from !== 'string' || typeof to !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Valid from and to dates (YYYY-MM-DD) are required',
          status: 400
        }
      });
    }

    const fromBounds = getDhakaDayBounds(from);
    const toBounds = getDhakaDayBounds(to);
    if (!fromBounds || !toBounds) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Valid from and to dates (YYYY-MM-DD) are required',
          status: 400
        }
      });
    }

    if (fromBounds.start >= toBounds.end) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Start date must be on or before end date',
          status: 400
        }
      });
    }

    const Reading = getReadingModel(req.deviceId);
    const rows = await Reading.find({
      created_at: { $gte: fromBounds.start, $lt: toBounds.end }
    })
      .sort({ created_at: -1 })
      .limit(MAX_EXPORT_ROWS + 1)
      .lean();

    const truncated = rows.length > MAX_EXPORT_ROWS;
    const exportRows = truncated ? rows.slice(0, MAX_EXPORT_ROWS) : rows;

    const header = 'Timestamp (Asia/Dhaka),Device ID,Ammonia (ppm),Methane (ppm),Humidity (%),Temperature (F)';
    const lines = exportRows.map((row) => {
      const ts = row.created_at
        ? toDhakaShifted(row.created_at).toISOString().replace('T', ' ').slice(0, 19)
        : '';
      return [
        formatCsvCell(ts),
        formatCsvCell(row.device_id || req.deviceId),
        formatCsvCell(row.ammonia),
        formatCsvCell(row.methane),
        formatCsvCell(row.humidity),
        formatCsvCell(row.temperature)
      ].join(',');
    });

    const csv = [header, ...lines].join('\r\n');
    const safeFilenameDevice = String(req.deviceId).replace(/[^A-Za-z0-9_-]/g, '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prohori-${safeFilenameDevice}-${from}-to-${to}.csv"`);
    res.setHeader('X-Export-Row-Cap', String(MAX_EXPORT_ROWS));
    res.setHeader('X-Export-Truncated', truncated ? 'true' : 'false');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getLatest,
  getDailyAverages,
  getLog,
  getCalendar,
  getDay,
  exportCsv
};
