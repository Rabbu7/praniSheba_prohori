/**
 * Threshold & Zone Classification Logic for Prohori IoT Metrics
 * 
 * Zones: 'safe' | 'warning' | 'danger'
 * 
 * Table from AGENTS.md:
 * - Ammonia (ppm): 0–10 safe, 10–25 warning, above 25 danger
 * - Methane (ppm): 10–1,000 safe, 1,000–5,000 warning, above 50,000 danger (5,000 to 50,000 is still warning)
 * - Humidity (%): 50–70 safe, 40–50 or 70–80 warning, below 40 or above 80 danger
 * - Temperature (°F): 40–68 safe, 25–40 or 68–79 warning, below 25 or above 79 danger
 */

const THRESHOLDS = {
  ammonia: {
    unit: 'ppm',
    bands: [
      { zone: 'safe', min: 0, max: 10 },
      { zone: 'warning', min: 10, max: 25 },
      { zone: 'danger', min: 25, max: null }
    ]
  },
  methane: {
    unit: 'ppm',
    bands: [
      { zone: 'safe', min: 10, max: 1000 },
      { zone: 'warning', min: 1000, max: 5000 },
      { zone: 'danger', min: 50000, max: null }
    ]
  },
  humidity: {
    unit: '%',
    bands: [
      { zone: 'danger', min: null, max: 40 },
      { zone: 'warning', min: 40, max: 50 },
      { zone: 'safe', min: 50, max: 70 },
      { zone: 'warning', min: 70, max: 80 },
      { zone: 'danger', min: 80, max: null }
    ]
  },
  temperature: {
    unit: '°F',
    bands: [
      { zone: 'danger', min: null, max: 25 },
      { zone: 'warning', min: 25, max: 40 },
      { zone: 'safe', min: 40, max: 68 },
      { zone: 'warning', min: 68, max: 79 },
      { zone: 'danger', min: 79, max: null }
    ]
  }
};

// NOTE: THRESHOLDS and the zone functions below must stay in sync. If thresholds change, update both.

function getAmmoniaZone(val) {
  if (val === undefined || val === null) return 'safe';
  if (val > 25) return 'danger';
  if (val > 10) return 'warning';
  return 'safe';
}

function getMethaneZone(val) {
  if (val === undefined || val === null) return 'safe';
  if (val > 50000) return 'danger';
  if (val > 1000) return 'warning';
  return 'safe';
}

function getHumidityZone(val) {
  if (val === undefined || val === null) return 'safe';
  if (val < 40 || val > 80) return 'danger';
  if ((val >= 40 && val < 50) || (val > 70 && val <= 80)) return 'warning';
  return 'safe';
}

function getTemperatureZone(val) {
  if (val === undefined || val === null) return 'safe';
  if (val < 25 || val > 79) return 'danger';
  if ((val >= 25 && val < 40) || (val > 68 && val <= 79)) return 'warning';
  return 'safe';
}

/**
 * Calculates zone classifications for all 4 metrics of a given reading document/object.
 * @param {Object} reading - Object containing ammonia, methane, humidity, temperature
 * @returns {Object} Object with zone string for each metric
 */
function getZones(reading = {}) {
  return {
    ammonia_zone: getAmmoniaZone(reading.ammonia),
    methane_zone: getMethaneZone(reading.methane),
    humidity_zone: getHumidityZone(reading.humidity),
    temperature_zone: getTemperatureZone(reading.temperature)
  };
}

module.exports = {
  THRESHOLDS,
  getZones,
  getAmmoniaZone,
  getMethaneZone,
  getHumidityZone,
  getTemperatureZone
};
