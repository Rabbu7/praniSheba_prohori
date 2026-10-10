/**
 * migrateDevices.js — Phase 6 one-time idempotent migration.
 *
 * For each user:
 *   - Has a non-null `device` field and an empty `devices` array
 *     → copy device into devices array, $unset device.
 *   - Has `device: null` and empty `devices`
 *     → set devices: [] (already the default, just $unset device).
 *   - Already has entries in `devices`
 *     → skip (idempotent).
 *
 * Safe to re-run. Never creates duplicate entries.
 *
 * Usage:
 *   node src/seed/migrateDevices.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrate() {
  await connectDB();

  // Operate on the raw collection to avoid Mongoose schema conflicts during
  // the transition (the old `device` field is no longer in the new schema).
  const collection = mongoose.connection.collection('users');

  // 1. Users who had a device linked: copy it into the devices array.
  const withDevice = await collection
    .find({ 'device.deviceId': { $type: 'string' }, 'devices.0': { $exists: false } })
    .toArray();

  console.log(`Found ${withDevice.length} user(s) with a legacy device field to migrate.`);

  let migrated = 0;
  for (const user of withDevice) {
    const entry = {
      deviceId: user.device.deviceId,
      linkedAt: user.device.linkedAt || new Date()
    };

    const result = await collection.updateOne(
      {
        _id: user._id,
        'devices.deviceId': { $ne: entry.deviceId } // guard against re-run duplicates
      },
      {
        $push: { devices: entry },
        $unset: { device: '' }
      }
    );

    if (result.modifiedCount > 0) {
      migrated++;
      console.log(`  Migrated user ${user.username || user._id}: device ${entry.deviceId}`);
    } else {
      console.log(`  Skipped user ${user.username || user._id} (already migrated).`);
    }
  }

  // 2. Users who had device: null — just remove the stale field.
  const withNull = await collection
    .find({ device: null, 'devices.0': { $exists: false } })
    .toArray();

  let nullCleaned = 0;
  for (const user of withNull) {
    const result = await collection.updateOne(
      { _id: user._id, device: null },
      { $unset: { device: '' } }
    );
    if (result.modifiedCount > 0) nullCleaned++;
  }

  console.log(`Migrated ${migrated} device(s); cleaned ${nullCleaned} null device field(s).`);
  console.log('Migration complete.');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
