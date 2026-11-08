function serializeAlert(alert, userId = null) {
  if (!alert) return null;

  const doc = typeof alert.toObject === 'function' ? alert.toObject() : alert;
  const id = doc._id ? doc._id.toString() : (doc.id ? doc.id.toString() : '');

  let read = false;
  if (userId && Array.isArray(doc.readBy)) {
    const targetIdStr = userId.toString();
    read = doc.readBy.some((item) => (item ? item.toString() === targetIdStr : false));
  }

  return {
    id,
    deviceId: doc.deviceId,
    metric: doc.metric,
    zone: doc.zone,
    value: doc.value,
    createdAt: doc.createdAt,
    resolvedAt: doc.resolvedAt || null,
    read
  };
}

module.exports = { serializeAlert };

