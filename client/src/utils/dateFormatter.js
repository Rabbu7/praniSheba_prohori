/**
 * Date formatting helpers for Prohori Dashboard UI
 */

export const DHAKA_TZ = 'Asia/Dhaka';

/**
 * Today's calendar date in Asia/Dhaka, independent of the browser timezone.
 * Returns { year, month, day } as numbers (month is 1-12).
 */
export function getDhakaToday(now = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return { year, month, day };
}

export function formatAbsoluteDate(dateInput, lang = 'en') {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const locale = lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US';
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DHAKA_TZ,
  });
}

export function formatChartDate(dateInput, lang = 'en') {
  if (!dateInput) return '';

  const date = new Date(`${dateInput}T00:00:00`);
  if (isNaN(date.getTime())) return '';

  const locale = lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US';
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatChartTime(dateInput, range = '7d', lang = 'en') {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const locale = lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US';
  if (range === '30d') {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(dateInput, lang = 'en') {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  const locale = lang === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: DHAKA_TZ });
}

export function formatRelativeTime(dateInput, lang = 'en') {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  const time = date.getTime();
  if (isNaN(time)) return '—';

  const diffInSeconds = Math.floor((Date.now() - time) / 1000);
  if (lang === 'bn') {
    if (diffInSeconds < 60) return 'এইমাত্র';
    const mins = Math.floor(diffInSeconds / 60);
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    return `${days} দিন আগে`;
  }

  if (diffInSeconds < 60) return 'Just now';
  const mins = Math.floor(diffInSeconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

