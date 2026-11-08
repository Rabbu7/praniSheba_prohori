const { getReadingModel } = require('../models/Reading');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { getZones } = require('../utils/thresholds');
const { createAlertEngine } = require('../utils/alertEngine');
const { serializeAlert } = require('../utils/serializeAlert');

const RECONNECT_DELAY_MS = 5000;

const engine = createAlertEngine();
const changeStreams = new Map();
const reconnectTimers = new Map();
const deviceQueues = new Map();
let initializationPromise = null;

function getZonesByMetric(reading) {
  const z = getZones(reading);
  return {
    ammonia: z.ammonia_zone,
    methane: z.methane_zone,
    humidity: z.humidity_zone,
    temperature: z.temperature_zone
  };
}

function queueDeviceTask(deviceId, task) {
  const previous = deviceQueues.get(deviceId) || Promise.resolve();
  const next = previous
    .then(task)
    .catch((err) => {
      console.error(`Task queue error for device ${deviceId}:`, err);
    });
  deviceQueues.set(deviceId, next);
  return next;
}

async function initDeviceAlerts(deviceId) {
  const Reading = getReadingModel(deviceId);
  const latest = await Reading.findOne().sort({ created_at: -1 }).lean();
  const zonesByMetric = latest ? getZonesByMetric(latest) : {
    ammonia: 'safe',
    methane: 'safe',
    humidity: 'safe',
    temperature: 'safe'
  };

  engine.seed(deviceId, zonesByMetric);

  const openAlerts = await Alert.find({ deviceId, resolvedAt: null }).lean();
  const now = new Date();
  for (const alert of openAlerts) {
    const seededZone = zonesByMetric[alert.metric] || 'safe';
    if (alert.zone !== seededZone) {
      await Alert.updateOne(
        { _id: alert._id, resolvedAt: null },
        { $set: { resolvedAt: now } }
      );
    }
  }
}

function initChangeStream(io) {
  if (initializationPromise) {
    return initializationPromise;
  }

  const watchDevice = async (deviceId) => {
    if (changeStreams.has(deviceId)) {
      return changeStreams.get(deviceId);
    }

    try {
      await initDeviceAlerts(deviceId);
    } catch (err) {
      console.error(`Error initializing alerts for device ${deviceId}:`, err);
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

      const fullDocument = change.fullDocument;
      const zones = getZones(fullDocument);
      const payload = {
        ...fullDocument,
        ...zones
      };

      // Emit new-reading exactly as before and before alert work
      io.to(`device:${deviceId}`).emit('new-reading', payload);

      // Process alert transitions sequentially for this device
      queueDeviceTask(deviceId, async () => {
        try {
          const zonesByMetric = {
            ammonia: zones.ammonia_zone,
            methane: zones.methane_zone,
            humidity: zones.humidity_zone,
            temperature: zones.temperature_zone
          };

          const transitions = engine.process(deviceId, zonesByMetric);
          if (!transitions || transitions.length === 0) {
            return;
          }

          for (const transition of transitions) {
            const { metric, to } = transition;
            const readingValue = typeof fullDocument[metric] === 'number' ? fullDocument[metric] : 0;
            const readingCreatedAt = fullDocument.created_at
              ? new Date(fullDocument.created_at)
              : new Date();

            if (to === 'safe') {
              const resolvedAt = new Date();
              const existing = await Alert.findOneAndUpdate(
                { deviceId, metric, resolvedAt: null },
                { $set: { resolvedAt } },
                { returnDocument: 'after' }
              ).lean();

              if (existing) {
                io.to(`device:${deviceId}`).emit('alert-resolved', {
                  id: existing._id.toString(),
                  deviceId,
                  metric,
                  resolvedAt
                });
              }
            } else {
              // Transition to non-safe: first resolve any open alert for (deviceId, metric)
              const resolvedAt = new Date();
              const existing = await Alert.findOneAndUpdate(
                { deviceId, metric, resolvedAt: null },
                { $set: { resolvedAt } },
                { returnDocument: 'after' }
              ).lean();

              if (existing) {
                io.to(`device:${deviceId}`).emit('alert-resolved', {
                  id: existing._id.toString(),
                  deviceId,
                  metric,
                  resolvedAt
                });
              }

              try {
                const newAlert = await Alert.create({
                  deviceId,
                  metric,
                  zone: to,
                  value: readingValue,
                  createdAt: readingCreatedAt,
                  resolvedAt: null,
                  readBy: []
                });

                io.to(`device:${deviceId}`).emit('new-alert', serializeAlert(newAlert));
              } catch (err) {
                if (err.code !== 11000) {
                  console.error(`Alert creation error for ${deviceId}:${metric}:`, err);
                }
              }
            }
          }
        } catch (alertError) {
          console.error(`Alert processing error for ${deviceId}:`, alertError);
        }
      });
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

  initializationPromise = (async () => {
    try {
      const devices = await Device.find().lean();
      for (const { deviceId } of devices) {
        await watchDevice(deviceId);
      }
      return changeStreams;
    } catch (error) {
      initializationPromise = null;
      console.error(`MongoDB device watch initialization failed: ${error.message}`);
      throw error;
    }
  })();

  return initializationPromise;
}

initChangeStream.engine = engine;

module.exports = initChangeStream;
