const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  metric: {
    type: String,
    required: true,
    enum: ['ammonia', 'methane', 'humidity', 'temperature']
  },
  zone: {
    type: String,
    required: true,
    enum: ['warning', 'danger']
  },
  value: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  readBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  }
});

alertSchema.index({ deviceId: 1, createdAt: -1 });
alertSchema.index(
  { deviceId: 1, metric: 1 },
  { unique: true, partialFilterExpression: { resolvedAt: null } }
);

module.exports = mongoose.model('Alert', alertSchema, 'alerts');

