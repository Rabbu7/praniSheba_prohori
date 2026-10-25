const User = require('../models/User');

async function publicUser(user) {
  const isFarmer = user.role === 'farmer';
  const manager = isFarmer && user.district
    ? await User.findOne({
      role: 'manager',
      status: 'active',
      district: user.district
    }).select('firstName lastName phone').lean()
    : null;

  const profileComplete = !isFarmer || Boolean(
    user.firstName && user.lastName && user.division && user.district
  );

  return {
    id: user._id.toString(),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email,
    role: user.role,
    status: user.status,
    division: user.division || '',
    district: user.district || '',
    phone: user.phone || '',
    devices: user.devices || [],
    profileComplete,
    manager: manager
      ? { firstName: manager.firstName, lastName: manager.lastName, phone: manager.phone || '' }
      : null
  };
}

module.exports = { publicUser };
