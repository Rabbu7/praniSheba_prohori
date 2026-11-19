const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { getReadableDeviceIds } = require('../utils/readableDevices');
const { serializeAlert } = require('../utils/serializeAlert');
const { createError } = require('../utils/errors');

async function buildDeviceFarmerMap(deviceIds) {
  const map = new Map();
  if (!deviceIds || deviceIds.length === 0) return map;

  const farmers = await User.find({
    role: 'farmer',
    status: 'active',
    'devices.deviceId': { $in: deviceIds }
  }).select('_id devices.deviceId').lean();

  for (const farmer of farmers) {
    const farmerId = farmer._id.toString();
    for (const entry of farmer.devices || []) {
      if (entry && entry.deviceId) {
        map.set(entry.deviceId, farmerId);
      }
    }
  }
  return map;
}

const ALLOWED_QUERY_KEYS = new Set(['limit', 'unreadOnly', 'status']);

async function getAlerts(req, res, next) {
  try {
    for (const key of Object.keys(req.query)) {
      if (!ALLOWED_QUERY_KEYS.has(key) || typeof req.query[key] !== 'string') {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
    }

    let limit = 20;
    if (req.query.limit !== undefined) {
      if (!/^[1-9]\d*$/.test(req.query.limit)) {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
      const parsed = parseInt(req.query.limit, 10);
      if (parsed < 1 || parsed > 100) {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
      limit = parsed;
    }

    let unreadOnly = false;
    if (req.query.unreadOnly !== undefined) {
      if (req.query.unreadOnly !== 'true' && req.query.unreadOnly !== 'false') {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
      unreadOnly = req.query.unreadOnly === 'true';
    }

    let status;
    if (req.query.status !== undefined) {
      if (req.query.status !== 'open' && req.query.status !== 'resolved') {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
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

    const [alerts, unreadCount, farmerMap] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .lean(),
      Alert.countDocuments(unreadFilter),
      req.user.role === 'manager' ? buildDeviceFarmerMap(ids) : Promise.resolve(null)
    ]);

    return res.json({
      alerts: alerts.map((a) => {
        const farmerId = req.user.role === 'farmer'
          ? req.user._id.toString()
          : (farmerMap ? farmerMap.get(a.deviceId) || null : null);
        return serializeAlert(a, req.user._id, farmerId);
      }),
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
      throw createError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    const ids = await getReadableDeviceIds(req.user);
    if (!ids || ids.length === 0) {
      throw createError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    const result = await Alert.updateOne(
      { _id: id, deviceId: { $in: ids } },
      { $addToSet: { readBy: req.user._id } }
    );

    if (result.matchedCount === 0) {
      throw createError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    const alertDoc = await Alert.findById(id).lean();
    if (!alertDoc) {
      throw createError('Alert not found', 404, 'ALERT_NOT_FOUND');
    }

    let farmerId = null;
    if (req.user.role === 'farmer') {
      farmerId = req.user._id.toString();
    } else {
      const owner = await User.findOne({
        role: 'farmer',
        status: 'active',
        'devices.deviceId': alertDoc.deviceId
      }).select('_id').lean();
      farmerId = owner ? owner._id.toString() : null;
    }

    return res.json({ alert: serializeAlert(alertDoc, req.user._id, farmerId) });
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

