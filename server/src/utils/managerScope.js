const User = require('../models/User');

async function getDistrictFarmers(manager) {
  if (!manager || !manager.district) return [];

  return User.find({
    role: 'farmer',
    status: 'active',
    district: manager.district
  });
}

async function getManagerDeviceIds(manager) {
  const farmers = await getDistrictFarmers(manager);
  return farmers.flatMap((farmer) => (farmer.devices || [])
    .map((device) => device.deviceId)
    .filter(Boolean));
}

module.exports = { getDistrictFarmers, getManagerDeviceIds };
