const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 50 ? normalized : null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8;
}

function normalizePhone(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\s-]/g, '');
  return PHONE_PATTERN.test(normalized) ? normalized : null;
}

module.exports = {
  normalizeName,
  normalizeEmail,
  isValidPassword,
  normalizePhone
};
