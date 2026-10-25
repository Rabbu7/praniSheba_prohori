const User = require('../models/User');

function respondError(res, message, status) {
  return res.status(status).json({ error: { message, status } });
}

async function resolveDevice(req, res, next) {
  const hasMalformedDeviceIdKey = Object.keys(req.query)
    .some((key) => key.startsWith('deviceId['));
  if (hasMalformedDeviceIdKey) {
    return respondError(res, 'Device not found for this account', 403);
  }

  const requestedDeviceId = req.query.deviceId;
  if (requestedDeviceId !== undefined && typeof requestedDeviceId !== 'string') {
    return respondError(res, 'Device not found for this account', 403);
  }

  if (req.user.role === 'admin' || !['farmer', 'manager'].includes(req.user.role)) {
    return respondError(res, 'Forbidden', 403);
  }

  if (req.user.role === 'manager') {
    if (requestedDeviceId === undefined) {
      return respondError(res, 'deviceId is required', 400);
    }

    const isInDistrict = Boolean(req.user.district) && await User.exists({
      role: 'farmer',
      status: 'active',
      district: req.user.district,
      'devices.deviceId': requestedDeviceId
    });

    if (!isInDistrict) {
      return respondError(res, 'Device not found for this account', 403);
    }

    req.deviceId = requestedDeviceId;
    return next();
  }

  const userDevices = req.user.devices || [];

  if (userDevices.length === 0) {
    return respondError(res, 'No device linked', 403);
  }

  if (requestedDeviceId !== undefined) {
    const owned = userDevices.some((device) => device.deviceId === requestedDeviceId);
    if (!owned) {
      return respondError(res, 'Device not found for this account', 403);
    }
    req.deviceId = requestedDeviceId;
  } else {
    req.deviceId = userDevices[0].deviceId;
  }

  return next();
}

module.exports = resolveDevice;
