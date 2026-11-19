const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { publicUser } = require('../utils/publicUser');
const { isValidLocation } = require('../utils/locations');
const {
  normalizeName,
  normalizeEmail,
  isValidPassword
} = require('../utils/validators');

const { createError } = require('../utils/errors');

const BCRYPT_COST = 10;
const JWT_EXPIRES_IN = '7d';
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('prohori-timing-dummy-password', BCRYPT_COST);

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
      throw createError('Invalid registration details', 400, 'INVALID_REGISTRATION_DETAILS');
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw createError('Email already in use', 409, 'EMAIL_IN_USE');
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
        throw createError('Email already in use', 409, 'EMAIL_IN_USE');
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
    const candidatePassword = typeof password === 'string' ? password : '';
    const hashToCompare = user && user.passwordHash ? user.passwordHash : DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(candidatePassword, hashToCompare);

    if (!user || user.status !== 'active' || typeof password !== 'string' || !passwordMatches) {
      throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
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

module.exports = {
  register,
  login,
  me
};
