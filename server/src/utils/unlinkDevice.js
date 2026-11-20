const mongoose = require('mongoose');
const User = require('../models/User');
const Alert = require('../models/Alert');
const DeviceRequest = require('../models/DeviceRequest');
const { createError } = require('./errors');
const { revalidateSocket } = require('../sockets/socketAuth');

async function unlinkFarmerDevice({ farmerId, deviceId, managerUser = null, io = null }) {
  if (!mongoose.isValidObjectId(farmerId)) {
    throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
  }

  if (typeof deviceId !== 'string' || !deviceId.trim()) {
    throw createError('Device not found for this account', 404, 'DEVICE_NOT_FOUND');
  }

  const normalizedDeviceId = deviceId.trim();
  const farmerFilter = {
    _id: farmerId,
    role: 'farmer',
    status: 'active'
  };
  if (managerUser) {
    farmerFilter.district = managerUser.district;
  }

  const farmer = await User.findOne(farmerFilter).select('_id').lean();
  if (!farmer) {
    throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
  }

  const updated = await User.findOneAndUpdate(
    { _id: farmer._id, 'devices.deviceId': normalizedDeviceId },
    { $pull: { devices: { deviceId: normalizedDeviceId } } },
    { returnDocument: 'after' }
  );

  if (!updated) {
    throw createError('Device not found for this account', 404, 'DEVICE_NOT_FOUND');
  }

  await DeviceRequest.updateMany(
    { farmerId: farmer._id, deviceId: normalizedDeviceId, status: 'approved' },
    { $set: { status: 'unlinked' } }
  );

  const resolvedAt = new Date();
  const openAlerts = await Alert.find({ deviceId: normalizedDeviceId, resolvedAt: null })
    .select('_id metric')
    .lean();

  if (openAlerts.length > 0) {
    await Alert.updateMany(
      { deviceId: normalizedDeviceId, resolvedAt: null },
      { $set: { resolvedAt } }
    );

    if (io) {
      for (const alert of openAlerts) {
        io.to(`device:${normalizedDeviceId}`).emit('alert-resolved', {
          id: alert._id.toString(),
          deviceId: normalizedDeviceId,
          metric: alert.metric,
          resolvedAt
        });
      }
    }
  }

  const { engine } = require('../sockets/changeStream');
  if (engine && typeof engine.forget === 'function') {
    engine.forget(normalizedDeviceId);
  }

  if (io) {
    for (const socket of io.sockets.sockets.values()) {
      if (
        socket.data
        && Array.isArray(socket.data.deviceIds)
        && socket.data.deviceIds.includes(normalizedDeviceId)
      ) {
        revalidateSocket(socket);
      }
    }
  }

  return { deviceId: normalizedDeviceId };
}

module.exports = { unlinkFarmerDevice };
