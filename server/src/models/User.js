const mongoose = require('mongoose');

const deviceEntrySchema = new mongoose.Schema({
  deviceId: String,
  linkedAt: Date
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    default: ''
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    default: ''
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
  role: {
    type: String,
    enum: ['admin', 'manager', 'farmer'],
    default: 'farmer'
  },
  status: {
    type: String,
    enum: ['active', 'removed'],
    default: 'active'
  },
  division: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  devices: {
    type: [deviceEntrySchema],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

userSchema.index(
  { district: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'manager', status: 'active' }
  }
);

function removePasswordHash(_document, returnedObject) {
  delete returnedObject.passwordHash;
  return returnedObject;
}

userSchema.set('toJSON', { transform: removePasswordHash });
userSchema.set('toObject', { transform: removePasswordHash });

module.exports = mongoose.model('User', userSchema);
