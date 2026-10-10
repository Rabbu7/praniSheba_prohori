const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createAuthError(message = 'Authentication required') {
  const error = new Error(message);
  error.data = { status: 401 };
  return error;
}

const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;

  if (!token || typeof token !== 'string') {
    return next(createAuthError('Authentication required'));
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('Internal server error'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.sub) {
      return next(createAuthError('Authentication required'));
    }

    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user || !user.device || !user.device.deviceId) {
      return next(createAuthError('Authentication required'));
    }

    socket.data = socket.data || {};
    socket.data.userId = user._id.toString();
    socket.data.deviceId = user.device.deviceId;

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      return next(createAuthError('Authentication required'));
    }
    return next(createAuthError('Authentication required'));
  }
};

module.exports = socketAuth;
