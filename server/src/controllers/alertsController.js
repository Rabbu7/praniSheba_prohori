const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const { getReadableDeviceIds } = require('../utils/readableDevices');
const { serializeAlert } = require('../utils/serializeAlert');

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const ALLOWED_QUERY_KEYS = new Set(['limit', 'unreadOnly', 'status']);

async function getAlerts(req, res, next) {
  try {
    for (const key of Object.keys(req.query)) {
      if (!ALLOWED_QUERY_KEYS.has(key) || typeof req.query[key] !== 'string') {
        throw createError('Invalid query parameters', 400);
      }
    }

    let limit = 20;
    if (req.query.limit !== undefined) {
      if (!/^[1-9]\d*$/.test(req.query.limit)) {
        throw createError('Invalid query parameters', 400);
      }
      const parsed = parseInt(req.query.limit, 10);
      if (parsed < 1 || parsed > 100) {
        throw createError('Invalid query parameters', 400);
      }
      limit = parsed;
    }

    let unreadOnly = false;
    if (req.query.unreadOnly !== undefined) {
      if (req.query.unreadOnly !== 'true' && req.query.unreadOnly !== 'false') {
        throw createError('Invalid query parameters', 400);
      }
      unreadOnly = req.query.unreadOnly === 'true';
    }

    let status;
    if (req.query.status !== undefined) {
      if (req.query.status !== 'open' && req.query.status !== 'resolved') {
        throw createError('Invalid query parameters', 400);
      }
      status = req.query.status;
    }

    const ids = await getReadableDeviceIds(req.user);
    if (!ids || ids.length === 0) {
      return res.json({ alerts: [], unreadCount: 0 });
    }

    const filter = { deviceId: { $in: ids } };
    if (status === 'open') {
      filter.resolvedAt = null;
    } else if (status === 'resolved') {
      filter.resolvedAt = { $ne: null };
    }
    if (unreadOnly) {
      filter.readBy = { $ne: req.user._id };
    }

    const unreadFilter = {
      deviceId: { $in: ids },
      readBy: { $ne: req.user._id }
    };

    const [alerts, unreadCount] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
      Alert.countDocuments(unreadFilter)
    ]);

    return res.json({
      alerts: alerts.map((a) => serializeAlert(a, req.user._id)),
      unreadCount
    });
  } catch (error) {
    next(error);
  }
}

async function markAlertRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || String(new mongoose.Types.ObjectId(id)) !== id) {
      throw createError('Alert not found', 404);
    }

    const ids = await getReadableDeviceIds(req.user);
    if (!ids || ids.length === 0) {
      throw createError('Alert not found', 404);
    }

    const result = await Alert.updateOne(
      { _id: id, deviceId: { $in: ids } },
      { $addToSet: { readBy: req.user._id } }
    );

    if (result.matchedCount === 0) {
      throw createError('Alert not found', 404);
    }

    const alertDoc = await Alert.findById(id).lean();
    if (!alertDoc) {
      throw createError('Alert not found', 404);
    }

    return res.json({ alert: serializeAlert(alertDoc, req.user._id) });
  } catch (error) {
    next(error);
  }
}

async function markAllAlertsRead(req, res, next) {
  try {
    const ids = await getReadableDeviceIds(req.user);
    if (ids && ids.length > 0) {
      await Alert.updateMany(
        { deviceId: { $in: ids }, readBy: { $ne: req.user._id } },
        { $addToSet: { readBy: req.user._id } }
      );
    }

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAlerts,
  markAlertRead,
  markAllAlertsRead
};

