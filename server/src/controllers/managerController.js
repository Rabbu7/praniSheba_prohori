const mongoose = require('mongoose');
const DeviceRequest = require('../models/DeviceRequest');
const Message = require('../models/Message');
const { getDistrictFarmers } = require('../utils/managerScope');
const { unlinkFarmerDevice } = require('../utils/unlinkDevice');
const { serializeMessage } = require('../utils/serializeMessage');
const { createError } = require('../utils/errors');

function farmerSummary(farmer) {
  return {
    id: farmer._id.toString(),
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    phone: farmer.phone || '',
    division: farmer.division || '',
    district: farmer.district || '',
    deviceCount: (farmer.devices || []).length
  };
}

function farmerProfile(farmer) {
  return {
    id: farmer._id.toString(),
    firstName: farmer.firstName,
    lastName: farmer.lastName,
    email: farmer.email,
    phone: farmer.phone || '',
    division: farmer.division || '',
    district: farmer.district || '',
    devices: (farmer.devices || []).map((d) => ({
      deviceId: d.deviceId,
      nickname: d.nickname || '',
      linkedAt: d.linkedAt
    }))
  };
}

async function getOverview(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    const farmerIds = farmers.map((farmer) => farmer._id);
    const deviceCount = farmers.reduce((count, farmer) => count + (farmer.devices || []).length, 0);
    const pendingRequestCount = await DeviceRequest.countDocuments({
      farmerId: { $in: farmerIds },
      status: 'pending'
    });

    return res.json({
      farmerCount: farmers.length,
      deviceCount,
      pendingRequestCount
    });
  } catch (error) {
    return next(error);
  }
}

async function listFarmers(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    farmers.sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`));
    return res.json({ farmers: farmers.map(farmerSummary) });
  } catch (error) {
    return next(error);
  }
}

async function getFarmer(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.farmerId)) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }

    const farmer = (await getDistrictFarmers(req.user))
      .find((candidate) => candidate._id.toString() === req.params.farmerId);
    if (!farmer) throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');

    return res.json(farmerProfile(farmer));
  } catch (error) {
    return next(error);
  }
}

async function unlinkDevice(req, res, next) {
  try {
    const result = await unlinkFarmerDevice({
      farmerId: req.params.farmerId,
      deviceId: req.params.deviceId,
      managerUser: req.user,
      io: req.app.get('io')
    });
    return res.json({ success: true, deviceId: result.deviceId });
  } catch (error) {
    return next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    const farmerIds = farmers.map((f) => f._id);

    const unreadCounts = await Message.aggregate([
      { $match: { farmerId: { $in: farmerIds }, senderRole: 'farmer', readAt: null } },
      { $group: { _id: '$farmerId', count: { $sum: 1 } } }
    ]);
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

    const latestMessages = await Message.aggregate([
      { $match: { farmerId: { $in: farmerIds } } },
      { $sort: { _id: -1 } },
      { $group: { _id: '$farmerId', lastDoc: { $first: '$$ROOT' } } }
    ]);
    const lastMessageMap = new Map(latestMessages.map((m) => [m._id.toString(), serializeMessage(m.lastDoc)]));

    const conversations = farmers.map((farmer) => {
      const fId = farmer._id.toString();
      return {
        farmer: {
          id: fId,
          firstName: farmer.firstName,
          lastName: farmer.lastName,
          phone: farmer.phone || '',
          district: farmer.district || ''
        },
        lastMessage: lastMessageMap.get(fId) || null,
        unreadCount: unreadMap.get(fId) || 0
      };
    });

    conversations.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return `${a.farmer.firstName} ${a.farmer.lastName}`.localeCompare(`${b.farmer.firstName} ${b.farmer.lastName}`);
    });

    const totalUnread = unreadCounts.reduce((sum, u) => sum + u.count, 0);

    return res.json({ conversations, totalUnread });
  } catch (error) {
    return next(error);
  }
}

async function getFarmerMessages(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.farmerId)) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }
    const farmers = await getDistrictFarmers(req.user);
    const farmer = farmers.find((c) => c._id.toString() === req.params.farmerId);
    if (!farmer) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }

    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 30;

    const query = { farmerId: farmer._id };
    if (req.query.before) {
      if (!mongoose.isValidObjectId(req.query.before)) {
        throw createError('Invalid cursor', 400, 'BAD_REQUEST');
      }
      query._id = { $lt: new mongoose.Types.ObjectId(req.query.before) };
    }

    const docs = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    if (hasMore) {
      docs.pop();
    }

    const messages = docs.reverse().map(serializeMessage);

    return res.json({
      messages,
      hasMore,
      farmer: {
        id: farmer._id.toString(),
        firstName: farmer.firstName,
        lastName: farmer.lastName,
        phone: farmer.phone || '',
        district: farmer.district || ''
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendFarmerMessage(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.farmerId)) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }
    const farmers = await getDistrictFarmers(req.user);
    const farmer = farmers.find((c) => c._id.toString() === req.params.farmerId);
    if (!farmer) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }

    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 1000) {
      throw createError('Message must be between 1 and 1000 characters', 400, 'INVALID_MESSAGE');
    }

    const message = await Message.create({
      farmerId: farmer._id,
      senderId: req.user._id,
      senderRole: 'manager',
      body
    });

    const serialized = serializeMessage(message);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${farmer._id.toString()}`)
        .to(`user:${req.user._id.toString()}`)
        .emit('new-message', serialized);
    }

    return res.status(201).json({ message: serialized });
  } catch (error) {
    return next(error);
  }
}

async function markFarmerMessagesRead(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.farmerId)) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }
    const farmers = await getDistrictFarmers(req.user);
    const farmer = farmers.find((c) => c._id.toString() === req.params.farmerId);
    if (!farmer) {
      throw createError('Farmer not found', 404, 'FARMER_NOT_FOUND');
    }

    await Message.updateMany(
      { farmerId: farmer._id, senderRole: 'farmer', readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function getManagerUnreadCount(req, res, next) {
  try {
    const farmers = await getDistrictFarmers(req.user);
    const farmerIds = farmers.map((f) => f._id);
    const unreadCount = await Message.countDocuments({
      farmerId: { $in: farmerIds },
      senderRole: 'farmer',
      readAt: null
    });
    return res.json({ unreadCount });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  listFarmers,
  getFarmer,
  unlinkDevice,
  listConversations,
  getFarmerMessages,
  sendFarmerMessage,
  markFarmerMessagesRead,
  getManagerUnreadCount
};
