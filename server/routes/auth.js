const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Admin login
router.post('/login', 
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    console.log('LOGIN REQ BODY:', req.body); // Debug log
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const admin = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { adminId: admin.id, username: admin.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      logger.info('Admin login successful:', { username: admin.username });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username
          }
        }
      });
    } finally {
      client.release();
    }
  })
);

// Admin registration (no email validation, generate username and password if not provided)
router.post('/register', 
  [
    body('name').notEmpty().withMessage('Name is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { uid, password, name } = req.body;

    // Generate username and password if not provided
    let username = uid;
    if (!username) {
      username = 'U' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    if (!password) {
      password = Math.random().toString(36).slice(-8);
    }

    const client = await pool.connect();

    try {
      // Check if admin already exists
      const existingAdmin = await client.query(
        'SELECT id FROM admin_users WHERE username = $1',
        [username]
      );

      if (existingAdmin.rows.length > 0) {
        return res.status(400).json({ error: 'Admin already exists with this username' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin
      const result = await client.query(
        'INSERT INTO admin_users (username, password_hash, name, email) VALUES ($1, $2, $3, $4) RETURNING id',
        [username, passwordHash, name, `${username}@example.com`]
      );

      logger.info('Admin registered:', { username, name });

      res.status(201).json({
        success: true,
        message: 'Admin registered successfully',
        data: {
          id: result.rows[0].id,
          username,
          name,
          password // Return generated password if it was generated
        }
      });
    } finally {
      client.release();
    }
  })
);

// Verify token
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, email, name FROM admin_users WHERE id = $1',
        [decoded.adminId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        success: true,
        data: {
          admin: result.rows[0]
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}));

// Token validation endpoint for frontend
router.get('/validate', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username FROM admin_users WHERE id = $1',
        [decoded.adminId]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.json({
        success: true,
        user: {
          id: result.rows[0].id,
          username: result.rows[0].username
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}));

module.exports = router; 