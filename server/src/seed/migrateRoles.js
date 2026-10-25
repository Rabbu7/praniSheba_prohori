require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const PROFILE_FIELDS = ['firstName', 'lastName', 'division', 'district', 'phone'];

async function migrateRoles() {
  await connectDB();
  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();
  const usernameIndex = indexes.find((index) => index.key && index.key.username === 1);

  if (usernameIndex) {
    await collection.dropIndex(usernameIndex.name);
    console.log(`Dropped legacy ${usernameIndex.name} index before removing username fields.`);
  }

  const users = await collection.find({
    $or: [{ role: { $exists: false } }, { role: null }]
  }).toArray();

  let migrated = 0;
  let usernameFieldsRemoved = 0;

  for (const user of users) {
    const set = { role: 'farmer', status: 'active' };
    for (const field of PROFILE_FIELDS) {
      if (user[field] === undefined || user[field] === null) set[field] = '';
    }

    const result = await collection.updateOne(
      { _id: user._id, $or: [{ role: { $exists: false } }, { role: null }] },
      { $set: set, $unset: { username: '' } }
    );

    if (result.modifiedCount > 0) {
      migrated++;
      if (user.username !== undefined) usernameFieldsRemoved++;
    }
  }

  console.log(`Found ${users.length} user(s) without a role.`);
  console.log(`Migrated ${migrated} user(s); removed username from ${usernameFieldsRemoved} user(s).`);
  console.log('Role migration complete.');
  await mongoose.disconnect();
  process.exit(0);
}

migrateRoles().catch(async (error) => {
  console.error(`Role migration failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
