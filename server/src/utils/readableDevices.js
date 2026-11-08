const { getDistrictFarmers } = require('./managerScope');

async function getReadableDeviceIds(user) {
  if (!user || typeof user !== 'object') {
    return [];
  }

  if (user.role === 'farmer') {
    return (user.devices || [])
      .map((d) => d.deviceId)
      .filter(Boolean);
  }

  if (user.role === 'manager') {
    const farmers = await getDistrictFarmers(user);
    return farmers.flatMap((farmer) => (farmer.devices || [])
      .map((device) => device.deviceId)
      .filter(Boolean));
  }

  return [];
}

module.exports = { getReadableDeviceIds };

