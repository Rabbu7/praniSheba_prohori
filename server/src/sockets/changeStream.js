const { getReadingModel } = require('../models/Reading');
const Device = require('../models/Device');
const { getZones } = require('../utils/thresholds');

const RECONNECT_DELAY_MS = 5000;

const changeStreams = new Map();
const reconnectTimers = new Map();
let initializationPromise = null;

function initChangeStream(io) {
  if (initializationPromise) {
    return initializationPromise;
  }

  const watchDevice = (deviceId) => {
    if (changeStreams.has(deviceId)) {
      return changeStreams.get(deviceId);
    }

    const Reading = getReadingModel(deviceId);
    const changeStream = Reading.watch([
      { $match: { operationType: 'insert' } }
    ]);
    changeStreams.set(deviceId, changeStream);

    console.log(`MongoDB change stream watching for device ${deviceId}`);

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
      console.error(`MongoDB change stream error for ${deviceId}: ${error.message}`);

      if (changeStreams.get(deviceId) === changeStream) {
        changeStreams.delete(deviceId);
      }

      changeStream.close().catch(() => {});

      if (!reconnectTimers.has(deviceId)) {
        const reconnectTimer = setTimeout(() => {
          reconnectTimers.delete(deviceId);
          watchDevice(deviceId);
        }, RECONNECT_DELAY_MS);
        reconnectTimers.set(deviceId, reconnectTimer);
      }
    });

    return changeStream;
  };

  initializationPromise = Device.find()
    .then((devices) => {
      devices.forEach(({ deviceId }) => watchDevice(deviceId));
      return changeStreams;
    })
    .catch((error) => {
      initializationPromise = null;
      console.error(`MongoDB device watch initialization failed: ${error.message}`);
      throw error;
    });

  return initializationPromise;
}

module.exports = initChangeStream;