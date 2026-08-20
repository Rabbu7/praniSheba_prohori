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
  getZones,
  getAmmoniaZone,
  getMethaneZone,
  getHumidityZone,
  getTemperatureZone
};
