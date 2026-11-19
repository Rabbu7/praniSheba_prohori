const DANGEROUS_PROPS = new Set(['__proto__', 'constructor', 'prototype']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sanitizeInPlace(target) {
  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i += 1) {
      sanitizeInPlace(target[i]);
    }
    return;
  }

  if (!isPlainObject(target)) {
    return;
  }

  for (const key of Object.keys(target)) {
    if (DANGEROUS_PROPS.has(key) || key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      sanitizeInPlace(target[key]);
    }
  }
}

function sanitizeInput(req, _res, next) {
  if (req.body) sanitizeInPlace(req.body);
  if (req.query) sanitizeInPlace(req.query);
  if (req.params) sanitizeInPlace(req.params);
  next();
}

module.exports = {
  sanitizeInPlace,
  sanitizeInput
};
