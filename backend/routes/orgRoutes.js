const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { Organization } = require('../models');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');

router.post('/', 
  protect, 
  adminOnly,
  validate([
    body('domain').isFQDN(),
    body('name').isLength({ min: 3 })
  ]),
  async (req, res) => {
    try {
      const { domain, name } = req.body;
      const existingOrg = await Organization.findOne({ domain });
      if (existingOrg) {
        return res.status(400).json({ 
          code: 'DOMAIN_EXISTS',
          message: 'Organization domain already registered' 
        });
      }

      const organization = await Organization.create({ 
        domain, 
        name,
        createdBy: req.user.id 
      });
      
      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (err) {
      res.status(400).json({
        code: 'ORG_CREATION_FAILED',
        message: err.message 
      });
    }
  }
);

module.exports = router;