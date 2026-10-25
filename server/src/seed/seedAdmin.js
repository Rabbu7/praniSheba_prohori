require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');

const REQUIRED_ENV = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_FIRST_NAME', 'ADMIN_LAST_NAME'];

async function seedAdmin() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name] || !process.env[name].trim());
  if (missing.length > 0) {
    throw new Error(`Missing required admin environment variable(s): ${missing.join(', ')}`);
  }

  await connectDB();
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists for ${email}; no changes made.`);
  } else {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await User.create({
      firstName: process.env.ADMIN_FIRST_NAME.trim(),
      lastName: process.env.ADMIN_LAST_NAME.trim(),
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
      division: '',
      district: '',
      phone: '',
      devices: []
    });
    console.log(`Created admin for ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch(async (error) => {
  console.error(`Admin seed failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
