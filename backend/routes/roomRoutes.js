const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { User, Room } = require('../models');
const mongoose = require('mongoose');

// GET /api/rooms - List available rooms
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching rooms for user:', req.user.id);
    
    const user = await User.findById(req.user.id)
      .populate('organization')
      .select('+organization');

    if (!user.organization) {
      return res.status(400).json({ message: 'User organization not found' });
    }

    const rooms = await Room.find({
      organization: user.organization._id,
      isActive: true,
      $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] }
    }).sort('-createdAt');

    console.log(`Found ${rooms.length} available rooms`);
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ 
      code: 'FETCH_ROOMS_FAILED',
      message: err.message 
    });
  }
});

// POST /api/rooms/auto-join - Auto-join an available room or create one
router.post('/auto-join', protect, async (req, res) => {
  try {
    console.log('Auto-join request received from user:', req.user.id);
    
    const user = await User.findById(req.user.id)
      .populate('organization')
      .select('+organization');
    
    console.log('User found:', user._id, 'Organization:', user.organization?._id);

    if (!user.organization) {
      console.log('User organization not found');
      return res.status(400).json({ message: 'User organization not found' });
    }

    // Cleanup previous rooms first
    await Room.updateMany(
      {
        organization: user.organization._id,
        participants: req.user.id
      },
      { $pull: { participants: req.user.id } }
    );

    // Find available room or create new one
    let room = await Room.findOne({
      organization: user.organization._id,
      isActive: true,
      $expr: { $lt: [{ $size: "$participants" }, 9] }
    });

    if (!room) {
      console.log('No available room found, creating new one');
      // Create new room if none available
      room = await Room.create({
        organization: user.organization._id,
        createdBy: req.user.id,
        participants: [req.user.id],
        isActive: true,
        name: `Room-${Date.now()}`
      });
      console.log('New room created:', room._id);
    } else {
      console.log('Joining existing room:', room._id);
      // Join existing room
      room.participants.push(req.user.id);
      await room.save();
    }

    console.log('Room operation successful:', room._id);
    res.json(room);
  } catch (err) {
    console.error('Auto-join error:', err);
    res.status(500).json({ 
      code: 'AUTO_JOIN_FAILED',
      message: err.message 
    });
  }
});

// POST /api/rooms/join - Join a specific room
router.post('/join', protect, async (req, res) => {
  try {
    const { roomId } = req.body;
    const user = await User.findById(req.user.id)
      .populate('organization')
      .select('+organization');

    if (!user.organization) {
      return res.status(400).json({ message: 'User organization not found' });
    }

    // Cleanup previous rooms
    await Room.updateMany(
      {
        organization: user.organization._id,
        participants: req.user.id
      },
      { $pull: { participants: req.user.id } }
    );

    const room = await Room.findOne({
      _id: roomId,
      organization: user.organization._id,
      isActive: true,
      $expr: { $lt: [{ $size: "$participants" }, "$maxParticipants"] }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or full' });
    }

    room.participants.push(req.user.id);
    await room.save();

    res.json(room);
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ 
      code: 'JOIN_ROOM_FAILED',
      message: err.message 
    });
  }
});

// POST /api/rooms/leave - Leave a room
router.post('/leave', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const user = await User.findById(req.user.id).select('+organization');
    const room = await Room.findOneAndUpdate(
      { 
        participants: req.user.id,
        organization: user.organization 
      },
      { $pull: { participants: req.user.id } },
      { new: true, session }
    );

    if (!room) {
      await session.abortTransaction();
      return res.status(404).json({ code: 'NO_ACTIVE_ROOM' });
    }

    if (room.participants.length === 0) {
      await Room.deleteOne({ _id: room._id }).session(session);
      console.log('Deleted empty room:', room._id);
    }

    await session.commitTransaction();
    res.json({ success: true });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ 
      code: 'ROOM_LEAVE_FAILED',
      message: err.message 
    });
  } finally {
    session.endSession();
  }
});

module.exports = router;