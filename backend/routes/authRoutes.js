const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Registration validation
const registerValidation = [
  body('name').notEmpty().trim(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
];

// Use the imported register controller instead of local implementation
router.post('/register', registerValidation, validate, register);

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Generated token for user:', user.email);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;