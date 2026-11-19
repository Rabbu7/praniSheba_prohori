const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const {
  normalizeName,
  normalizeEmail,
  isValidPassword,
  normalizePhone
} = require('../utils/validators');
const { isValidLocation } = require('../utils/locations');
const { createError } = require('../utils/errors');
const { unlinkFarmerDevice } = require('../utils/unlinkDevice');
const { revalidateSocket } = require('../sockets/socketAuth');

const BCRYPT_COST = 10;

function managerSummary(manager) {
  const id = manager._id ? manager._id.toString() : (manager.id ? manager.id.toString() : '');
  return {
    id,
    firstName: manager.firstName,
    lastName: manager.lastName,
    email: manager.email,
    phone: manager.phone || '',
    division: manager.division || '',
    district: manager.district || '',
    status: manager.status || 'active',
    farmerCount: typeof manager.farmerCount === 'number' ? manager.farmerCount : 0,
    createdAt: manager.createdAt
  };
}

async function getOverview(req, res, next) {
  try {
    const [managerCount, farmerCount, deviceAggregation, managedDistricts, farmerDistricts] = await Promise.all([
      User.countDocuments({ role: 'manager', status: 'active' }),
      User.countDocuments({ role: 'farmer', status: 'active' }),
      User.aggregate([
        { $match: { role: 'farmer', status: 'active' } },
        { $project: { count: { $size: { $ifNull: ['$devices', []] } } } },
        { $group: { _id: null, total: { $sum: '$count' } } }
      ]),
      User.distinct('district', { role: 'manager', status: 'active' }),
      User.distinct('district', {
        role: 'farmer',
        status: 'active',
        district: { $exists: true, $nin: ['', null] }
      })
    ]);

    const deviceCount = deviceAggregation.length > 0 ? deviceAggregation[0].total : 0;
    const managedSet = new Set(managedDistricts.filter(Boolean));
    const unmanagedDistrictCount = farmerDistricts.filter((d) => Boolean(d) && !managedSet.has(d)).length;

    return res.json({
      managerCount,
      farmerCount,
      deviceCount,
      unmanagedDistrictCount
    });
  } catch (error) {
    return next(error);
  }
}

async function listManagers(req, res, next) {
  try {
    const rawStatus = req.query.status;
    if (rawStatus !== undefined && typeof rawStatus !== 'string') {
      throw createError('Invalid status filter', 400, 'INVALID_QUERY_PARAMETERS');
    }
    const statusFilter = rawStatus || 'active';
    if (!['active', 'removed', 'all'].includes(statusFilter)) {
      throw createError('Invalid status filter', 400, 'INVALID_QUERY_PARAMETERS');
    }

    const matchStage = { role: 'manager' };
    if (statusFilter !== 'all') {
      matchStage.status = statusFilter;
    }

    const managers = await User.aggregate([
      {
        $match: matchStage
      },
      {
        $lookup: {
          from: 'users',
          let: { managerDistrict: '$district' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$role', 'farmer'] },
                    { $eq: ['$status', 'active'] },
                    { $ne: ['$$managerDistrict', ''] },
                    { $eq: ['$district', '$$managerDistrict'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'farmerStats'
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          division: 1,
          district: 1,
          status: 1,
          createdAt: 1,
          farmerCount: {
            $ifNull: [{ $arrayElemAt: ['$farmerStats.count', 0] }, 0]
          }
        }
      },
      {
        $sort: {
          firstName: 1,
          lastName: 1
        }
      }
    ]);

    return res.json({ managers: managers.map(managerSummary) });
  } catch (error) {
    return next(error);
  }
}

async function createManager(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      division,
      district,
      password
    } = req.body || {};

    const normalizedFirstName = normalizeName(firstName);
    if (!normalizedFirstName) {
      throw createError('First name is required and must be between 1 and 50 characters', 400, 'INVALID_FIRST_NAME');
    }

    const normalizedLastName = normalizeName(lastName);
    if (!normalizedLastName) {
      throw createError('Last name is required and must be between 1 and 50 characters', 400, 'INVALID_LAST_NAME');
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw createError('Valid email is required', 400, 'INVALID_EMAIL');
    }

    if (!isValidPassword(password)) {
      throw createError('Password must be at least 8 characters', 400, 'INVALID_PASSWORD');
    }

    if (typeof phone !== 'string') {
      throw createError('Phone number is required and must be valid', 400, 'INVALID_PHONE');
    }
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw createError('Phone number is required and must be valid', 400, 'INVALID_PHONE');
    }

    if (!isValidLocation(division, district)) {
      throw createError('District does not belong to the selected division', 400, 'INVALID_LOCATION');
    }

    const existingEmail = await User.exists({ email: normalizedEmail });
    if (existingEmail) {
      throw createError('Email already in use', 409, 'EMAIL_IN_USE');
    }

    const existingManager = await User.exists({
      role: 'manager',
      status: 'active',
      district
    });
    if (existingManager) {
      throw createError('This district already has a manager', 409, 'DISTRICT_HAS_MANAGER');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    let manager;
    try {
      manager = await User.create({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        passwordHash,
        role: 'manager',
        status: 'active',
        division,
        district,
        phone: normalizedPhone,
        devices: [],
        mustChangePassword: true,
        createdBy: req.user._id
      });
    } catch (error) {
      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.district) {
          throw createError('This district already has a manager', 409, 'DISTRICT_HAS_MANAGER');
        }
        if (error.keyPattern && error.keyPattern.email) {
          throw createError('Email already in use', 409, 'EMAIL_IN_USE');
        }
        if (error.message && error.message.includes('district')) {
          throw createError('This district already has a manager', 409, 'DISTRICT_HAS_MANAGER');
        }
        throw createError('Email already in use', 409, 'EMAIL_IN_USE');
      }
      throw error;
    }

    const farmerCount = await User.countDocuments({
      role: 'farmer',
      status: 'active',
      district: manager.district
    });

    return res.status(201).json({
      manager: managerSummary({
        ...manager.toObject(),
        farmerCount
      })
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteManager(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    const updated = await User.findOneAndUpdate(
      { _id: id, role: 'manager', status: 'active' },
      { $set: { status: 'removed' } }
    );

    if (!updated) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function restoreManager(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    let restored;
    try {
      restored = await User.findOneAndUpdate(
        { _id: id, role: 'manager', status: 'removed' },
        { $set: { status: 'active' } },
        { returnDocument: 'after' }
      ).lean();
    } catch (error) {
      if (error.code === 11000) {
        throw createError('This district already has a manager', 409, 'DISTRICT_HAS_MANAGER');
      }
      throw error;
    }

    if (!restored) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    const farmerCount = await User.countDocuments({
      role: 'farmer',
      status: 'active',
      district: restored.district
    });

    return res.json({
      manager: managerSummary({
        ...restored,
        farmerCount
      })
    });
  } catch (error) {
    return next(error);
  }
}

async function resetManagerPassword(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    const { password } = req.body || {};
    if (!isValidPassword(password)) {
      throw createError('Password must be at least 8 characters', 400, 'INVALID_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const updated = await User.findOneAndUpdate(
      { _id: id, role: 'manager', status: 'active' },
      { $set: { passwordHash, mustChangePassword: true } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      throw createError('Manager not found', 404, 'MANAGER_NOT_FOUND');
    }

    const io = req.app.get('io');
    if (io) {
      for (const socket of io.sockets.sockets.values()) {
        if (socket.data && socket.data.userId === id) {
          revalidateSocket(socket);
        }
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function unlinkDevice(req, res, next) {
  try {
    const result = await unlinkFarmerDevice({
      farmerId: req.params.farmerId,
      deviceId: req.params.deviceId,
      managerUser: null,
      io: req.app.get('io')
    });
    return res.json({ success: true, deviceId: result.deviceId });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  listManagers,
  createManager,
  deleteManager,
  restoreManager,
  resetManagerPassword,
  unlinkDevice
};
