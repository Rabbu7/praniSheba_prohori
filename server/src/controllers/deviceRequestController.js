const mongoose = require('mongoose');
const Device = require('../models/Device');
const DeviceRequest = require('../models/DeviceRequest');
const User = require('../models/User');
const { getDistrictFarmers } = require('../utils/managerScope');

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requestSummary(request) {
  const id = request._id ? request._id.toString() : (request.id ? request.id.toString() : '');
  return {
    id,
    deviceId: request.deviceId,
    status: request.status,
    requestedAt: request.requestedAt,
    decidedAt: request.decidedAt || null,
    note: request.note || null
  };
}

function managerRequestSummary(request, farmer) {
  return {
    ...requestSummary(request),
    farmer: {
      id: farmer._id.toString(),
      firstName: farmer.firstName,
      lastName: farmer.lastName
    }
  };
}

async function createDeviceRequest(req, res, next) {
  try {
    const { deviceId, deviceCode } = req.body || {};
    if (typeof deviceId !== 'string' || !deviceId.trim()
      || typeof deviceCode !== 'string' || !deviceCode.trim()) {
      throw createError('Invalid device ID or code', 400);
    }

    const normalizedDeviceId = deviceId.trim();
    const normalizedDeviceCode = deviceCode.trim();
    const seededDevice = await Device.findOne({ deviceId: normalizedDeviceId });
    if (!seededDevice || seededDevice.deviceCode !== normalizedDeviceCode) {
      throw createError('Invalid device ID or code', 400);
    }

    if ((req.user.devices || []).some((device) => device.deviceId === normalizedDeviceId)) {
      throw createError('You have already added this device', 409);
    }

    if (await User.exists({ 'devices.deviceId': normalizedDeviceId })) {
      throw createError('This device is already linked to another account', 409);
    }

    if (await DeviceRequest.exists({ farmerId: req.user._id, deviceId: normalizedDeviceId, status: 'pending' })) {
      throw createError('You already have a pending request for this device', 409);
    }

    if (await DeviceRequest.exists({ deviceId: normalizedDeviceId, status: 'pending' })) {
      throw createError('This device already has a pending request from another account', 409);
    }

    let request;
    try {
      request = await DeviceRequest.create({
        farmerId: req.user._id,
        deviceId: normalizedDeviceId,
        status: 'pending'
      });
    } catch (error) {
      if (error.code === 11000) {
        throw createError('This device already has a pending request from another account', 409);
      }
      throw error;
    }

    return res.status(201).json({ request: requestSummary(request) });
  } catch (error) {
    return next(error);
  }
}

async function listMine(req, res, next) {
  try {
    const requests = await DeviceRequest.find({ farmerId: req.user._id })
      .sort({ requestedAt: -1 })
      .lean();
    return res.json({ requests: requests.map(requestSummary) });
  } catch (error) {
    return next(error);
  }
}

async function findScopedRequest(manager, requestId) {
  if (!mongoose.isValidObjectId(requestId)) return null;
  const request = await DeviceRequest.findById(requestId).lean();
  if (!request) return null;

  const farmers = await getDistrictFarmers(manager);
  const farmer = farmers.find((candidate) => candidate._id.toString() === request.farmerId.toString());
  return farmer ? { request, farmer } : null;
}

async function listManagerRequests(req, res, next) {
  try {
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    const status = req.query.status || 'pending';
    if (!allowedStatuses.includes(status)) throw createError('Invalid request status', 400);

    const farmers = await getDistrictFarmers(req.user);
    const farmerIds = farmers.map((farmer) => farmer._id);
    const farmerById = new Map(farmers.map((farmer) => [farmer._id.toString(), farmer]));
    const requests = await DeviceRequest.find({ farmerId: { $in: farmerIds }, status })
      .sort({ requestedAt: -1 })
      .lean();

    return res.json({
      requests: requests
        .map((request) => {
          const farmer = farmerById.get(request.farmerId.toString());
          return farmer ? managerRequestSummary(request, farmer) : null;
        })
        .filter(Boolean)
    });
  } catch (error) {
    return next(error);
  }
}

async function markUnavailable(requestId, managerId, note) {
  await DeviceRequest.updateOne(
    { _id: requestId, status: 'pending' },
    {
      $set: {
        status: 'rejected',
        decidedBy: managerId,
        decidedAt: new Date(),
        note
      }
    }
  );
}

async function approveRequest(req, res, next) {
  try {
    const scoped = await findScopedRequest(req.user, req.params.id);
    if (!scoped) throw createError('Request not found', 404);
    if (scoped.request.status !== 'pending') throw createError('Request is no longer pending', 409);

    let result;
    try {
      result = await User.updateOne(
        { _id: scoped.request.farmerId, 'devices.deviceId': { $ne: scoped.request.deviceId } },
        { $push: { devices: { deviceId: scoped.request.deviceId, linkedAt: new Date() } } }
      );
    } catch (error) {
      if (error.code === 11000) {
        await markUnavailable(req.params.id, req.user._id, 'Already linked to another account');
        throw createError('Already linked to another account', 409);
      }
      throw error;
    }

    if (result.matchedCount === 0) {
      await markUnavailable(req.params.id, req.user._id, 'Already added');
      throw createError('Already added', 409);
    }

    const decidedAt = new Date();
    const updated = await DeviceRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'approved', decidedBy: req.user._id, decidedAt } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) throw createError('Request is no longer pending', 409);
    return res.json({ request: requestSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const scoped = await findScopedRequest(req.user, req.params.id);
    if (!scoped) throw createError('Request not found', 404);
    if (scoped.request.status !== 'pending') throw createError('Request is no longer pending', 409);

    const rawNote = req.body && req.body.note;
    if (rawNote !== undefined && typeof rawNote !== 'string') {
      throw createError('Invalid rejection note', 400);
    }
    const note = rawNote === undefined ? null : rawNote.trim();
    if (note && note.length > 200) throw createError('Invalid rejection note', 400);

    const updated = await DeviceRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          decidedBy: req.user._id,
          decidedAt: new Date(),
          note: note || null
        }
      },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) throw createError('Request is no longer pending', 409);
    return res.json({ request: requestSummary(updated) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createDeviceRequest,
  listMine,
  listManagerRequests,
  approveRequest,
  rejectRequest
};
