const mongoose = require('mongoose');

const deviceEntrySchema = new mongoose.Schema({
  deviceId: String,
  linkedAt: Date
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  devices: {
    type: [deviceEntrySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index(
  { 'devices.deviceId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'devices.deviceId': { $type: 'string' } }
  }
);

function removePasswordHash(_document, returnedObject) {
  delete returnedObject.passwordHash;
  return returnedObject;
}

userSchema.set('toJSON', { transform: removePasswordHash });
userSchema.set('toObject', { transform: removePasswordHash });

module.exports = mongoose.model('User', userSchema);
