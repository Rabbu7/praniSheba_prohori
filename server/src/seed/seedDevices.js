require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Device = require('../models/Device');

const seedDevices = async () => {
  try {
    await connectDB();
    await Device.updateOne(
      { deviceId: 'G3036' },
      { $set: { deviceId: 'G3036', deviceCode: 'PROHORI-G3036-7X4K2' } },
      { upsert: true }
    );
    console.log('Seeded device G3036');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Device seed failed: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDevices();
