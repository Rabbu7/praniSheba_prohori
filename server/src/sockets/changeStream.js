const Reading = require('../models/Reading');
const { getZones } = require('../utils/thresholds');

const RECONNECT_DELAY_MS = 5000;

let changeStream = null;
let reconnectTimer = null;

function initChangeStream(io) {
  if (changeStream) {
    return changeStream;
  }

  const startStream = () => {
    changeStream = Reading.watch([
      { $match: { operationType: 'insert' } }
    ]);

    console.log('MongoDB change stream watching for new readings');

    changeStream.on('change', (change) => {
      if (!change || !change.fullDocument) {
        return;
      }

      const payload = {
        ...change.fullDocument,
        ...getZones(change.fullDocument)
      };

      io.emit('new-reading', payload);
    });

    changeStream.on('error', (error) => {
      console.error(`MongoDB change stream error: ${error.message}`);

      if (changeStream) {
        changeStream.close().catch(() => {});
      }

      changeStream = null;

      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          startStream();
        }, RECONNECT_DELAY_MS);
      }
    });
  };

  startStream();
  return changeStream;
}

module.exports = initChangeStream;