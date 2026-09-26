const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

function publicUser(user) {
  return {
    username: user.username,
    email: user.email,
    device: user.device || null
  };
}

function signToken(user) {
  requireJwtSecret();
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};

    if (typeof username !== 'string' || !username.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || !password.trim()) {
      throw createError('Username, email, and password are required', 400);
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });

    if (existingUser) {
      throw createError('Username or email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;

    try {
      user = await User.create({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash
      });
    } catch (error) {
      if (error.code === 11000) {
        throw createError('Username or email already in use', 409);
      }
      throw error;
    }

    return res.status(201).json({
      token: signToken(user),
      user: publicUser(user)
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

    if (!passwordMatches) {
      throw createError('Invalid email or password', 401);
    }

    return res.status(200).json({
      token: signToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

const me = (req, res) => res.status(200).json({
  username: req.user.username,
  email: req.user.email,
  device: req.user.device || null
});

module.exports = {
  register,
  login,
  me
};
