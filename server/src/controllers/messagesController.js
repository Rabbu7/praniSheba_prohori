const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { createError } = require('../utils/errors');
const { serializeMessage } = require('../utils/serializeMessage');

async function getMessages(req, res, next) {
  try {
    let limit = 30;
    if (req.query.limit !== undefined) {
      if (!/^[1-9]\d*$/.test(req.query.limit)) {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
      const parsed = parseInt(req.query.limit, 10);
      if (parsed < 1 || parsed > 100) {
        throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
      }
      limit = parsed;
    }

    const query = { farmerId: req.user._id };
    const before = req.query.before;
    if (before !== undefined && (
      typeof before !== 'string'
      || !mongoose.Types.ObjectId.isValid(before)
      || String(new mongoose.Types.ObjectId(before)) !== before
    )) {
      throw createError('Invalid query parameters', 400, 'INVALID_QUERY_PARAMETERS');
    }
    if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
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

    const manager = await User.findOne({
      role: 'manager',
      status: 'active',
      district: req.user.district
    }).lean();

    return res.json({
      messages,
      hasMore,
      manager: manager
        ? {
            firstName: manager.firstName,
            lastName: manager.lastName,
            phone: manager.phone || ''
          }
        : null
    });
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body || body.length > 1000) {
      throw createError('Message must be between 1 and 1000 characters', 400, 'INVALID_MESSAGE');
    }

    const manager = await User.findOne({
      role: 'manager',
      status: 'active',
      district: req.user.district
    });

    if (!manager) {
      throw createError('Your district does not have an active manager assigned yet', 409, 'NO_MANAGER_ASSIGNED');
    }

    const message = await Message.create({
      farmerId: req.user._id,
      senderId: req.user._id,
      senderRole: 'farmer',
      body
    });

    const serialized = serializeMessage(message);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${manager._id.toString()}`)
        .to(`user:${req.user._id.toString()}`)
        .emit('new-message', serialized);
    }

    return res.status(201).json({ message: serialized });
  } catch (error) {
    return next(error);
  }
}

async function markMessagesRead(req, res, next) {
  try {
    await Message.updateMany(
      { farmerId: req.user._id, senderRole: 'manager', readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await Message.countDocuments({
      farmerId: req.user._id,
      senderRole: 'manager',
      readAt: null
    });
    return res.json({ unreadCount });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMessages,
  sendMessage,
  markMessagesRead,
  getUnreadCount
};
