const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createAuthError(message = 'Authentication required', status = 401, code = 'UNAUTHORIZED') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function isAllowedDuringPasswordChange(req) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return (req.method === 'GET' && path === '/api/auth/me')
    || (req.method === 'POST' && path === '/api/profile/password');
}

const requireAuth = async (req, res, next) => {
  const authorization = req.get('Authorization');
  const parts = authorization ? authorization.trim().split(/\s+/) : [];
  const [scheme, token] = parts;

  if (parts.length !== 2 || scheme !== 'Bearer' || !token) {
    return next(createAuthError());
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      return next(createAuthError('Authentication required'));
    }

    if (user.status !== 'active') {
      return next(createAuthError('Authentication required'));
    }

    if (user.mustChangePassword && !isAllowedDuringPasswordChange(req)) {
      return next(createAuthError('Password change required', 403, 'PASSWORD_CHANGE_REQUIRED'));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      return next(createAuthError());
    }

    return next(error);
  }
};

module.exports = requireAuth;
