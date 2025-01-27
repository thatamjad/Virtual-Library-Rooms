// backend/routes/onboardingRoutes.js

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { User, Organization } = require('../models');
const { validate } = require('../middleware/validation');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Create organization and admin user
router.post('/organization', 
  validate([
    body('organizationName').trim().isLength({ min: 2 }).withMessage('Organization Name must be at least 2 characters'),
    body('domain').trim().isLength({ min: 3 }).withMessage('Domain must be at least 3 characters'),
    body('adminName').trim().isLength({ min: 2 }).withMessage('Admin Name must be at least 2 characters'),
    body('adminEmail').isEmail().withMessage('Admin Email must be a valid email'),
    body('adminPassword').isLength({ min: 6 }).withMessage('Admin Password must be at least 6 characters')
  ]),
  async (req, res) => {
    try {
      console.log('Received organization creation request:', req.body);
      const { organizationName, domain, adminName, adminEmail, adminPassword } = req.body;

      // Check if organization exists
      const existingOrg = await Organization.findOne({ domain });
      if (existingOrg) {
        console.log('Organization already exists with domain:', domain);
        return res.status(400).json({
          code: 'DOMAIN_EXISTS',
          message: 'Organization already exists'
        });
      }

      // Check if admin email exists
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (existingAdmin) {
        console.log('Admin email already registered:', adminEmail);
        return res.status(400).json({
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        });
      }

      // Start a session and transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create organization
        const organization = await Organization.create([{
          name: organizationName,
          domain,
          isActive: true,
          createdBy: null // Initially null, will be set after admin creation
        }], { session });

        // Create admin user
        const admin = await User.create([{
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          organization: organization[0]._id,
          isAdmin: true
        }], { session });

        // Update organization with createdBy field
        organization[0].createdBy = admin[0]._id;
        await organization[0].save({ session });

        await session.commitTransaction();

        // Generate JWT token
        const token = jwt.sign({ id: admin[0]._id }, process.env.JWT_SECRET, {
          expiresIn: '7d'
        });

        console.log('Organization and admin created successfully:', organization[0]._id);
        res.status(201).json({
          message: 'Organization and admin created successfully',
          token
        });
      } catch (error) {
        await session.abortTransaction();
        console.error('Transaction error:', error);
        res.status(500).json({
          code: 'ONBOARDING_FAILED',
          message: 'Failed to create organization and admin'
        });
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      res.status(500).json({
        code: 'ONBOARDING_FAILED',
        message: err.message
      });
    }
  }
);

module.exports = router;