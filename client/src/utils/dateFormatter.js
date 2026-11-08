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

export function formatAbsoluteDate(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DHAKA_TZ,
  });
}

export function formatChartDate(dateInput) {
  if (!dateInput) return '';

  const date = new Date(`${dateInput}T00:00:00`);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatChartTime(dateInput, range = '7d') {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  if (range === '30d') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(dateInput) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: DHAKA_TZ });
}
