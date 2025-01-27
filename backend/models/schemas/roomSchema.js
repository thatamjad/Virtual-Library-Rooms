const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    default: () => `Room-${Date.now()}`,
    trim: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  maxParticipants: {
    type: Number,
    default: 9
  }
}, { timestamps: true });

RoomSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.maxParticipants;
});

RoomSchema.index({ organization: 1, isActive: 1 });

module.exports = RoomSchema; 