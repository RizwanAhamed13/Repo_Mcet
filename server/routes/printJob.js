const express = require('express');
const { body, validationResult } = require('express-validator');
const { uploadWithScan, cleanupUploadedFile } = require('../middleware/upload');
const { generateUserToken } = require('../middleware/auth');
const { uploadFile, getFileUrl, deleteFile } = require('../config/localStorage');
const { pool, logAuditTrail } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger, logFileOperation } = require('../utils/logger');

const router = express.Router();

// Create print job
router.post('/', 
  uploadWithScan,
  [
    body('rollNumber').notEmpty().withMessage('Roll number is required'),
    body('totalPages').isInt({ min: 1 }).withMessage('Total pages must be a positive integer'),
    body('colorPages').isInt({ min: 0 }).withMessage('Color pages must be a non-negative integer'),
    body('bwPages').isInt({ min: 0 }).withMessage('B&W pages must be a non-negative integer'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('printOptions').isObject().withMessage('Print options are required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { rollNumber, totalPages, colorPages, bwPages, price, printOptions } = req.body;
    const { fileInfo } = req;

    if (!fileInfo) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const client = await pool.connect();

    try {
      // Upload file to local storage
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(fileInfo.path);
      const uploadResult = await uploadFile(fileBuffer, fileInfo.originalName, fileInfo.mimetype);

      // Generate order token
      const token = generateUserToken();

      // Create order in database
      const result = await client.query(`
        INSERT INTO orders (
          token, roll_number, file_name, file_url, total_pages, 
          color_pages, bw_pages, price, print_options
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, token, created_at
      `, [
        token, rollNumber, fileInfo.originalName, uploadResult.key,
        totalPages, colorPages, bwPages, price, JSON.stringify(printOptions)
      ]);

      const order = result.rows[0];

      // Log audit trail
      await logAuditTrail('create_order', 'orders', order.id, null, {
        token: order.token,
        rollNumber,
        totalPages,
        price
      }, req);

      // Don't clean up uploaded file immediately - let it stay for a while
      // cleanupUploadedFile(fileInfo.path);

      logFileOperation('file_uploaded', {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        orderId: order.id,
        filePath: fileInfo.path,
        storageKey: uploadResult.key
      });

      res.status(201).json({
        success: true,
        order: {
          id: order.id,
          token: order.token,
          rollNumber,
          totalPages,
          colorPages,
          bwPages,
          price,
          createdAt: order.created_at
        }
      });
    } catch (error) {
      // Clean up uploaded file on error
      cleanupUploadedFile(fileInfo.path);
      throw error;
    } finally {
      client.release();
    }
  })
);

// Get file preview URL
router.get('/preview/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT file_url FROM orders WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];
    const fileUrl = await getFileUrl(order.file_url);

    res.json({
      success: true,
      previewUrl: fileUrl
    });
  } finally {
    client.release();
  }
}));

// Delete order (within 30 seconds of creation)
router.delete('/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, created_at, file_url FROM orders 
      WHERE token = $1 AND status = 'pending'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    const order = result.rows[0];
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const timeDiff = (now - createdAt) / 1000; // seconds

    if (timeDiff > 30) {
      return res.status(400).json({ error: 'Order can only be cancelled within 30 seconds' });
    }

    // Delete file from local storage
    await deleteFile(order.file_url);

    // Delete order from database
    await client.query('DELETE FROM orders WHERE id = $1', [order.id]);

    // Log audit trail
    await logAuditTrail('cancel_order', 'orders', order.id, {
      token,
      createdAt: order.created_at
    }, null, req);

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } finally {
    client.release();
  }
}));

module.exports = router; 