const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { User, Room, Report } = require('../models');

// Submit report
router.post('/', protect, async (req, res) => {
  try {
    const { reportedUserId, roomId, reason } = req.body;
    
    // Create report
    const report = await Report.create({
      reporter: req.user.id,
      reportedUser: reportedUserId,
      room: roomId,
      reason
    });

    // Check if 50% threshold is met
    const room = await Room.findById(roomId).populate('participants');
    const totalParticipants = room.participants.length;
    const reports = await Report.countDocuments({ 
      reportedUser: reportedUserId,
      room: roomId 
    });

    if (reports >= Math.ceil(totalParticipants / 2)) {
      // Block user
      await User.findByIdAndUpdate(reportedUserId, {
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
      });

      // Remove from room
      room.participants = room.participants.filter(
        p => !p._id.equals(reportedUserId)
      );
      await room.save();

      // Notify all clients
      req.app.get('io').to(roomId).emit('userBlocked', reportedUserId);
    }

    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;