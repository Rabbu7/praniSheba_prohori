const METRICS = ['ammonia', 'methane', 'humidity', 'temperature'];

function createAlertEngine() {
  const state = new Map();

  function seed(deviceId, zonesByMetric) {
    if (!deviceId) return;

    for (const metric of METRICS) {
      const key = `${deviceId}:${metric}`;
      const zone = (zonesByMetric && zonesByMetric[metric]) || 'safe';
      state.set(key, {
        confirmed: zone,
        pending: null,
        count: 0
      });
    }
  }

  function process(deviceId, zonesByMetric) {
    if (!deviceId) return [];
    const transitions = [];

    for (const metric of METRICS) {
      const key = `${deviceId}:${metric}`;
      let entry = state.get(key);

      if (!entry) {
        entry = {
          confirmed: 'safe',
          pending: null,
          count: 0
        };
        state.set(key, entry);
      }

      const zone = (zonesByMetric && zonesByMetric[metric]) || 'safe';

      if (zone === entry.confirmed) {
        entry.pending = null;
        entry.count = 0;
      } else if (zone === entry.pending) {
        entry.count++;
        if (entry.count >= 2) {
          transitions.push({
            metric,
            from: entry.confirmed,
            to: zone
          });
          entry.confirmed = zone;
          entry.pending = null;
          entry.count = 0;
        }
      } else {
        entry.pending = zone;
        entry.count = 1;
      }
    }

    return transitions;
  }

  return {
    seed,
    process
  };
}

module.exports = {
  METRICS,
  createAlertEngine
};

