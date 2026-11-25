function serializeMessage(doc) {
  if (!doc) return null;
  const raw = doc.toObject ? doc.toObject() : doc;
  return {
    id: (raw._id || raw.id).toString(),
    farmerId: (raw.farmerId && raw.farmerId._id ? raw.farmerId._id : raw.farmerId).toString(),
    senderId: (raw.senderId && raw.senderId._id ? raw.senderId._id : raw.senderId).toString(),
    senderRole: raw.senderRole,
    body: raw.body,
    createdAt: raw.createdAt,
    readAt: raw.readAt || null
  };
}

module.exports = { serializeMessage };
