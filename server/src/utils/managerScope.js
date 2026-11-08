const User = require('../models/User');

async function getDistrictFarmers(manager) {
  if (!manager || !manager.district) return [];

  return User.find({
    role: 'farmer',
    status: 'active',
    district: manager.district
  });
}

module.exports = { getDistrictFarmers };
