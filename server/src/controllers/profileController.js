const bcrypt = require('bcrypt');
const User = require('../models/User');
const { publicUser } = require('../utils/publicUser');
const { isValidLocation } = require('../utils/locations');
const {
  normalizeName,
  isValidPassword,
  normalizePhone
} = require('../utils/validators');

const { createError } = require('../utils/errors');

const updateProfile = async (req, res, next) => {
  try {
    const input = req.body || {};
    const isFarmer = req.user.role === 'farmer';
    const allowedFields = isFarmer
      ? ['firstName', 'lastName', 'phone', 'division', 'district']
      : ['firstName', 'lastName', 'phone'];
    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(input, field)) {
        updates[field] = input[field];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'firstName')) {
      updates.firstName = normalizeName(updates.firstName);
      if (!updates.firstName) throw createError('First name must be 1 to 50 characters', 400, 'INVALID_FIRST_NAME');
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'lastName')) {
      updates.lastName = normalizeName(updates.lastName);
      if (!updates.lastName) throw createError('Last name must be 1 to 50 characters', 400, 'INVALID_LAST_NAME');
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'phone')) {
      updates.phone = normalizePhone(updates.phone);
      if (updates.phone === null) throw createError('Invalid phone number', 400, 'INVALID_PHONE');
    }

    if (isFarmer && (Object.prototype.hasOwnProperty.call(updates, 'firstName')
      || Object.prototype.hasOwnProperty.call(updates, 'lastName'))) {
      const firstName = updates.firstName ?? req.user.firstName;
      const lastName = updates.lastName ?? req.user.lastName;
      if (!normalizeName(firstName) || !normalizeName(lastName)) {
        throw createError('First name and last name are required', 400, 'NAME_REQUIRED');
      }
    }

    if (isFarmer && (Object.prototype.hasOwnProperty.call(updates, 'division')
      || Object.prototype.hasOwnProperty.call(updates, 'district'))) {
      const division = typeof (updates.division ?? req.user.division) === 'string'
        ? (updates.division ?? req.user.division).trim()
        : '';
      const district = typeof (updates.district ?? req.user.district) === 'string'
        ? (updates.district ?? req.user.district).trim()
        : '';
      if (!isValidLocation(division, district)) {
        throw createError('Invalid division or district', 400, 'INVALID_LOCATION');
      }
      updates.division = division;
      updates.district = district;
    }

    Object.assign(req.user, updates);
    await req.user.save();
    return res.status(200).json(await publicUser(req.user));
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string') {
      throw createError('Current password is incorrect', 400, 'CURRENT_PASSWORD_INCORRECT');
    }
    if (typeof newPassword !== 'string' || !isValidPassword(newPassword)) {
      throw createError('New password must be at least 8 characters', 400, 'INVALID_PASSWORD');
    }

    const user = await User.findById(req.user._id);
    const matches = user && await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw createError('Current password is incorrect', 400, 'CURRENT_PASSWORD_INCORRECT');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();
    return res.status(200).json(await publicUser(user));
  } catch (error) {
    return next(error);
  }
};

const updateDeviceNickname = async (req, res, next) => {
  try {
    if (req.user.role !== 'farmer') {
      throw createError('Forbidden', 403, 'FORBIDDEN');
    }

    const { deviceId } = req.params;
    const rawNickname = req.body && req.body.nickname;
    if (rawNickname !== undefined && rawNickname !== null && typeof rawNickname !== 'string') {
      throw createError('Nickname must be 50 characters or fewer', 400, 'INVALID_NICKNAME');
    }

    const nickname = typeof rawNickname === 'string' ? rawNickname.trim() : '';
    if (nickname.length > 50) {
      throw createError('Nickname must be 50 characters or fewer', 400, 'INVALID_NICKNAME');
    }

    const updated = await User.findOneAndUpdate(
      { _id: req.user._id, 'devices.deviceId': deviceId },
      { $set: { 'devices.$.nickname': nickname } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw createError('Device not found for this account', 404, 'DEVICE_NOT_FOUND');
    }

    return res.status(200).json(await publicUser(updated));
  } catch (error) {
    return next(error);
  }
};

module.exports = { updateProfile, changePassword, updateDeviceNickname };
