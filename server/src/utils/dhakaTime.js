/**
 * Asia/Dhaka time helpers.
 * Dhaka is a fixed UTC+6 with no daylight saving time, so a constant offset
 * is exact and no timezone library is needed.
 */

const DHAKA_TZ = 'Asia/Dhaka';
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Shift an instant so its UTC fields read as Dhaka wall-clock fields. */
const toDhakaShifted = (date) => new Date(new Date(date).getTime() + DHAKA_OFFSET_MS);

/** 'YYYY-MM-DD' of the given instant in Dhaka. */
const dhakaDateKey = (date = new Date()) => toDhakaShifted(date).toISOString().slice(0, 10);

/** UTC Date of 00:00 Dhaka for the Dhaka day containing the given instant. */
const startOfDhakaDay = (date = new Date()) => {
  const shifted = toDhakaShifted(date);
  const midnightShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  return new Date(midnightShifted - DHAKA_OFFSET_MS);
};

/** Start of an N-day window: today's Dhaka midnight minus (days - 1) days. */
const getWindowStart = (days, now = new Date()) => (
  new Date(startOfDhakaDay(now).getTime() - (days - 1) * DAY_MS)
);

/**
 * UTC bounds of a Dhaka calendar month ('YYYY-MM').
 * Invalid or missing months default to the current Dhaka month.
 */
const getDhakaMonthBounds = (month) => {
  const isValidMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '');
  const monthKey = isValidMonth ? month : dhakaDateKey(new Date()).slice(0, 7);
  const [year, monthNumber] = monthKey.split('-').map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1) - DHAKA_OFFSET_MS),
    end: new Date(Date.UTC(year, monthNumber, 1) - DHAKA_OFFSET_MS)
  };
};

/** UTC bounds of a Dhaka calendar day ('YYYY-MM-DD'), or null if invalid. */
const getDhakaDayBounds = (date) => {
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '');
  const parsedDate = isValidDate ? new Date(`${date}T00:00:00.000Z`) : null;
  const isRealDate = parsedDate && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date;

  if (!isRealDate) {
    return null;
  }

  const start = new Date(parsedDate.getTime() - DHAKA_OFFSET_MS);
  return {
    start,
    end: new Date(start.getTime() + DAY_MS)
  };
};

module.exports = {
  DHAKA_TZ,
  dhakaDateKey,
  startOfDhakaDay,
  getWindowStart,
  getDhakaMonthBounds,
  getDhakaDayBounds
};
