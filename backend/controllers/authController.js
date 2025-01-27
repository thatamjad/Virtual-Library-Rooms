const { User, Organization } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Helper: Extract domain from email
const getDomain = (email) => email.split('@')[1].toLowerCase();

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // 1. Check if organization exists
    const domain = getDomain(email);
    const organization = await Organization.findOne({ domain });
    if (!organization) {
      return res.status(403).json({ message: "Organization not whitelisted" });
    }

    // 2. Create user
    const user = await User.create({
      name,
      email,
      password,
      organization: organization._id
    });

    // 3. Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked && user.blockedUntil > Date.now()) {
      return res.status(403).json({ message: "Account temporarily blocked" });
    }

    // Generate token with proper payload
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        organization: user.organization 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log the generated token for debugging
    console.log('Generated token:', token);

    res.json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        organization: user.organization
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};

