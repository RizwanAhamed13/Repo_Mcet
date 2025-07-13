const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { generateAdminToken, checkLoginAttempts, recordLoginAttempt } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger, logSecurity } = require('../utils/logger');

const router = express.Router();

// Admin login
router.post('/login', 
  checkLoginAttempts,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    const client = await pool.connect();

    try {
      // Get admin user
      const result = await client.query(
        'SELECT id, username, password_hash, email, role, is_active FROM admin_users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        recordLoginAttempt(req.ip, false);
        logSecurity('failed_login', { username, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        recordLoginAttempt(req.ip, false);
        logSecurity('login_attempt_disabled_user', { username, ip: req.ip });
        return res.status(401).json({ error: 'Account is disabled' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        recordLoginAttempt(req.ip, false);
        logSecurity('failed_login', { username, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateAdminToken(user.id);

      // Update last login
      await client.query(
        'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      recordLoginAttempt(req.ip, true);
      logSecurity('successful_login', { username, ip: req.ip });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } finally {
      client.release();
    }
  })
);

// Validate token
router.get('/validate', asyncHandler(async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ valid: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await pool.connect();
    
    const result = await client.query(
      'SELECT id, username, email, role FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: result.rows[0]
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
}));

// Create admin user (for initial setup)
router.post('/setup', 
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('email').isEmail().withMessage('Valid email is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password, email } = req.body;
    const client = await pool.connect();

    try {
      // Check if admin user already exists
      const existingUser = await client.query(
        'SELECT id FROM admin_users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Admin user already exists' });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin user
      const result = await client.query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
        [username, passwordHash, email, 'admin']
      );

      logger.info('Admin user created:', { username, email });

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        user: result.rows[0]
      });
    } finally {
      client.release();
    }
  })
);

module.exports = router; 