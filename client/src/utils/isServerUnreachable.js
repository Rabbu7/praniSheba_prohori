export function isServerUnreachable(err) {
  if (!err) return false;
  return !err.response || err.response.status >= 500;
}
