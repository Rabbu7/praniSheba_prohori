const Reading = require('../models/Reading');
const { getZones } = require('../utils/thresholds');

const RECONNECT_DELAY_MS = 5000;

const watchReadingChanges = (io) => {
  // Change Streams require a replica-set deployment; this Atlas cluster already has one.
  const changeStream = Reading.watch([
    { $match: { operationType: 'insert' } }
  ]);

  console.log('MongoDB change stream watching for new readings');

  changeStream.on('change', (change) => {
    if (change.fullDocument) {
      io.emit('new-reading', {
        ...change.fullDocument,
        ...getZones(change.fullDocument)
      });
    }
  });

  changeStream.on('error', (error) => {
    console.error(`MongoDB change stream error: ${error.message}`);
    changeStream.close().catch(() => {});
    setTimeout(() => watchReadingChanges(io), RECONNECT_DELAY_MS);
  });

  return changeStream;
};

module.exports = watchReadingChanges;