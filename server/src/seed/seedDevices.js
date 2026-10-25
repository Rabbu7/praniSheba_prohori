require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Device = require('../models/Device');
const User = require('../models/User');
const DeviceRequest = require('../models/DeviceRequest');

const SEEDED_DEVICES = [
  { deviceId: 'G3036', deviceCode: 'PROHORI-G3036-7X4K2' },
  { deviceId: 'G3037', deviceCode: 'PROHORI-G3037-9M2QF' },
  { deviceId: 'G3038', deviceCode: 'PROHORI-G3038-4TC8W' },
  { deviceId: 'G3040', deviceCode: 'PROHORI-G3040-2XJ7R' },
  { deviceId: 'G3041', deviceCode: 'PROHORI-G3041-V5K9D' },
  { deviceId: 'G3042', deviceCode: 'PROHORI-G3042-H6N3B' }
];

const seedDevices = async () => {
  try {
    await connectDB();
    for (const dev of SEEDED_DEVICES) {
      await Device.updateOne(
        { deviceId: dev.deviceId },
        { $set: dev },
        { upsert: true }
      );
    }
    await User.syncIndexes();
    await DeviceRequest.syncIndexes();

    const devices = await Device.find({}).sort({ deviceId: 1 }).lean();
    console.log('Seeded devices:', devices);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Device seed failed: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDevices();

