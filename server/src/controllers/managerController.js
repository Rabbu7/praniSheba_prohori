const mongoose = require('mongoose');
const DeviceRequest = require('../models/DeviceRequest');
const { getDistrictFarmers } = require('../utils/managerScope');

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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
    devices: farmer.devices || []
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
      throw createError('Farmer not found', 404);
    }

    const farmer = (await getDistrictFarmers(req.user))
      .find((candidate) => candidate._id.toString() === req.params.farmerId);
    if (!farmer) throw createError('Farmer not found', 404);

    return res.json(farmerProfile(farmer));
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOverview, listFarmers, getFarmer };
