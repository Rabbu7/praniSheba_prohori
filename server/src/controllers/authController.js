const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Device = require('../models/Device');
const { publicUser } = require('../utils/publicUser');
const { isValidLocation } = require('../utils/locations');
const {
  normalizeName,
  normalizeEmail,
  isValidPassword
} = require('../utils/validators');

const BCRYPT_COST = 10;
const JWT_EXPIRES_IN = '7d';

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
}

function signToken(user) {
  requireJwtSecret();
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, division, district } = req.body || {};
    const normalizedFirstName = normalizeName(firstName);
    const normalizedLastName = normalizeName(lastName);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail
      || !isValidPassword(password)
      || typeof division !== 'string' || typeof district !== 'string'
      || !division.trim() || !district.trim()
      || !isValidLocation(division.trim(), district.trim())) {
      throw createError('Invalid registration details', 400);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw createError('Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;

    try {
      user = await User.create({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        passwordHash,
        division: division.trim(),
        district: district.trim(),
        role: 'farmer',
        status: 'active'
      });
    } catch (error) {
      if (error.code === 11000) {
        throw createError('Email already in use', 409);
      }
      throw error;
    }

    return res.status(201).json({
      token: signToken(user),
      user: await publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = normalizedEmail ? await User.findOne({ email: normalizedEmail }) : null;
    const passwordMatches = user && typeof password === 'string'
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || user.status !== 'active' || !passwordMatches) {
      throw createError('Invalid email or password', 401);
    }

    return res.status(200).json({
      token: signToken(user),
      user: await publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    return res.status(200).json(await publicUser(req.user));
  } catch (error) {
    return next(error);
  }
};

const linkDevice = async (req, res, next) => {
  try {
    // 1. Validate input.
    const { deviceId, deviceCode } = req.body || {};
    if (typeof deviceId !== 'string' || !deviceId.trim()
      || typeof deviceCode !== 'string' || !deviceCode.trim()) {
      throw createError('Invalid device ID or code', 400);
    }

    const normalizedDeviceId = deviceId.trim();
    const normalizedDeviceCode = deviceCode.trim();

    // 2. Validate against the devices collection (same error for both failures
    //    so callers cannot determine which field was wrong).
    const seededDevice = await Device.findOne({ deviceId: normalizedDeviceId });
    if (!seededDevice || seededDevice.deviceCode !== normalizedDeviceCode) {
      throw createError('Invalid device ID or code', 400);
    }

    // 3. Atomic push: the $ne filter prevents the same user from adding the
    //    same device twice without a race condition.
    let result;
    try {
      result = await User.updateOne(
        { _id: req.user._id, 'devices.deviceId': { $ne: normalizedDeviceId } },
        { $push: { devices: { deviceId: normalizedDeviceId, linkedAt: new Date() } } }
      );
    } catch (error) {
      // 4. Duplicate-key → another account already owns this device.
      if (error.code === 11000) {
        throw createError('This device is already linked to another account', 409);
      }
      throw error;
    }

    if (result.matchedCount === 0) {
      throw createError('You have already added this device', 409);
    }

    // Reload the user to return the full updated devices array.
    const updatedUser = await User.findById(req.user._id);
    return res.status(200).json({ user: await publicUser(updatedUser) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  linkDevice
};
