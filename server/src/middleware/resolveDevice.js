/**
 * resolveDevice.js — Phase 6 middleware (replaces requireDevice).
 *
 * Runs after requireAuth. Sets req.deviceId to the device the request
 * is targeting, validated against the authenticated user's owned devices.
 *
 * Rules (from AGENTS.md):
 *   1. User has no devices → 403 "No device linked".
 *   2. ?deviceId= present but not in req.user.devices → 403 "Device not found for this account".
 *   3. ?deviceId= missing → default to the user's first device.
 *   4. Sets req.deviceId.
 */

function resolveDevice(req, res, next) {
  const userDevices = req.user.devices || [];

  if (userDevices.length === 0) {
    return res.status(403).json({
      error: {
        message: 'No device linked',
        status: 403
      }
    });
  }

  const { deviceId } = req.query;

  if (deviceId !== undefined) {
    const owned = userDevices.some((d) => d.deviceId === deviceId);
    if (!owned) {
      return res.status(403).json({
        error: {
          message: 'Device not found for this account',
          status: 403
        }
      });
    }
    req.deviceId = deviceId;
  } else {
    // Default to the first device in the array.
    req.deviceId = userDevices[0].deviceId;
  }

  return next();
}

module.exports = resolveDevice;
