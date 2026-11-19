const MIN_JWT_SECRET_LENGTH = 32;

function validateEnv({ requireAdmin = false } = {}) {
  const errors = [];

  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    errors.push('MONGO_URI is required');
  }

  if (!requireAdmin) {
    const jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required');
    } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
    }

    if (!process.env.CLIENT_ORIGIN || !process.env.CLIENT_ORIGIN.trim()) {
      errors.push('CLIENT_ORIGIN is required');
    }
  }

  if (requireAdmin) {
    const adminVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FIRST_NAME', 'ADMIN_LAST_NAME'];
    for (const name of adminVars) {
      if (!process.env[name] || !process.env[name].trim()) {
        errors.push(`${name} is required`);
      }
    }
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 8) {
      errors.push('ADMIN_PASSWORD must be at least 8 characters');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join('; ')}`);
  }
}

module.exports = {
  MIN_JWT_SECRET_LENGTH,
  validateEnv
};
