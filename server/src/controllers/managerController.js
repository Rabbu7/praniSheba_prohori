const mongoose = require('mongoose');
const DeviceRequest = require('../models/DeviceRequest');
const { getDistrictFarmers } = require('../utils/managerScope');
const { unlinkFarmerDevice } = require('../utils/unlinkDevice');

const { createError } = require('../utils/errors');

function farmerSummary(farmer) {
  return {
    id: farmer._id.toString(),
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    phone: farmer.phone || '',
    division: farmer.division || '',
    district: farmer.district || '',
    deviceCount: (farmer.devices || []).length
  };
}

function farmerProfile(farmer) {
  return {
    id: farmer._id.toString(),
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    phone: farmer.phone || '',
    division: farmer.division || '',
    district: farmer.district || '',
    devices: (farmer.devices || []).map((d) => ({
      deviceId: d.deviceId,
      nickname: d.nickname || '',
      linkedAt: d.linkedAt
    }))
  };
}

async function getOverview(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    const farmerIds = farmers.map((farmer) => farmer._id);
    const deviceCount = farmers.reduce((count, farmer) => count + (farmer.devices || []).length, 0);
    const pendingRequestCount = await DeviceRequest.countDocuments({
      farmerId: { $in: farmerIds },
      status: 'pending'
    });

    return res.json({
      farmerCount: farmers.length,
      deviceCount,
      pendingRequestCount
    });
  } catch (error) {
    return next(error);
  }
}

async function listFarmers(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    farmers.sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`));
    return res.json({ farmers: farmers.map(farmerSummary) });
  } catch (error) {
    return next(error);
  }
}

async function getFarmer(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.farmerId)) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }

    const farmer = (await getDistrictFarmers(req.user))
      .find((candidate) => candidate._id.toString() === req.params.farmerId);
    if (!farmer) throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');

    return res.json(farmerProfile(farmer));
  } catch (error) {
    return next(error);
  }
}

async function unlinkDevice(req, res, next) {
  try {
    const result = await unlinkFarmerDevice({
      farmerId: req.params.farmerId,
      deviceId: req.params.deviceId,
      managerUser: req.user,
      io: req.app.get('io')
    });
    return res.json({ success: true, deviceId: result.deviceId });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOverview, listFarmers, getFarmer, unlinkDevice };
