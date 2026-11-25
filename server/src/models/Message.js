const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['farmer', 'manager'],
    required: true
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  }
});

messageSchema.index({ farmerId: 1, _id: -1 });
messageSchema.index({ farmerId: 1, senderRole: 1, readAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
