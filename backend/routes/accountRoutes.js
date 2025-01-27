const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const crypto = require('crypto');
const sendEmail = require('../utils/email'); // You'll need to implement this
const { passwordResetTemplate } = require('../utils/emailTemplates');

// Reset Password Request
router.post('/forgot-password',
  validate([
    body('email').isEmail()
  ]),
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ message: 'No user found with that email' });
      }

      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        text: `To reset your password, click: ${resetURL}`,
        html: passwordResetTemplate(resetURL, user.name)
      });

      res.json({ message: 'Reset token sent to email' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Reset Password
router.post('/reset-password/:token',
  validate([
    body('password').isLength({ min: 6 })
  ]),
  async (req, res) => {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Admin: Get All Users (with pagination)
router.get('/',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User
        .find({ organization: req.user.organization })
        .select('-password')
        .skip(skip)
        .limit(limit)
        .populate('organization', 'name');

      const total = await User.countDocuments({ organization: req.user.organization });

      res.json({
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Admin: Update User Status
router.patch('/:userId/status',
  protect,
  adminOnly,
  validate([
    body('status').isIn(['active', 'suspended'])
  ]),
  async (req, res) => {
    try {
      const user = await User.findOneAndUpdate(
        { 
          _id: req.params.userId,
          organization: req.user.organization
        },
        { accountStatus: req.body.status },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router; 