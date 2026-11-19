const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getReadableDeviceIds } = require('../utils/readableDevices');

function createAuthError(message = 'Authentication required') {
  const error = new Error(message);
  error.data = { status: 401 };
  return error;
}

async function resolveSocketUser(token) {
  if (!token || typeof token !== 'string' || !process.env.JWT_SECRET) {
    return null;
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (!payload || !payload.sub) {
    return null;
  }

  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || user.status !== 'active' || user.role === 'admin' || user.mustChangePassword) {
    return null;
  }

  const deviceIds = await getReadableDeviceIds(user);
  if (deviceIds.length === 0) {
    return null;
  }

  return { user, deviceIds };
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
    const resolved = await resolveSocketUser(token);
    if (!resolved) {
      return next(createAuthError('Authentication required'));
    }

    socket.data = socket.data || {};
    socket.data.token = token;
    socket.data.userId = resolved.user._id.toString();
    socket.data.role = resolved.user.role;
    socket.data.deviceIds = resolved.deviceIds;

    return next();
  } catch (error) {
    return next(createAuthError('Authentication required'));
  }
};

async function revalidateSocket(socket) {
  try {
    const token = socket.data && socket.data.token;
    const resolved = await resolveSocketUser(token);
    if (!resolved) {
      socket.disconnect(true);
      return false;
    }

    const nextIds = new Set(resolved.deviceIds);
    const prevIds = Array.isArray(socket.data.deviceIds) ? socket.data.deviceIds : [];

    for (const oldId of prevIds) {
      if (!nextIds.has(oldId)) {
        socket.leave(`device:${oldId}`);
      }
    }

    for (const newId of nextIds) {
      if (!prevIds.includes(newId)) {
        socket.join(`device:${newId}`);
      }
    }

    socket.data.role = resolved.user.role;
    socket.data.deviceIds = resolved.deviceIds;
    return true;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      socket.disconnect(true);
      return false;
    }
    return false;
  }
}

module.exports = socketAuth;
module.exports.revalidateSocket = revalidateSocket;
