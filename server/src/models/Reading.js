const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true
  },
  ammonia: {
    type: Number,
    required: true
  },
  methane: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    required: true
  }
});

// Supports the time-window, calendar and latest-reading queries on created_at.
readingSchema.index({ created_at: -1 });

function getReadingModel(deviceId) {
  return mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId);
}

module.exports = { getReadingModel };
