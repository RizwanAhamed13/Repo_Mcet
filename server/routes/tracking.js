const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Track order by token
router.get('/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, token, roll_number, total_pages, color_pages, bw_pages, 
             price, status, created_at, updated_at
      FROM orders 
      WHERE token = $1
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];
    
    logger.info('Order tracked', { token, rollNumber: order.roll_number });

    res.json({
      success: true,
      order: {
        id: order.id,
        token: order.token,
        rollNumber: order.roll_number,
        totalPages: order.total_pages,
        colorPages: order.color_pages,
        bwPages: order.bw_pages,
        price: parseFloat(order.price),
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }
    });
  } finally {
    client.release();
  }
}));

// Track order by roll number
router.get('/roll/:rollNumber', asyncHandler(async (req, res) => {
  const { rollNumber } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, token, roll_number, total_pages, color_pages, bw_pages, 
             price, status, created_at, updated_at
      FROM orders 
      WHERE roll_number = $1
      ORDER BY created_at DESC
    `, [rollNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No orders found for this roll number' });
    }

    const orders = result.rows.map(order => ({
      id: order.id,
      token: order.token,
      rollNumber: order.roll_number,
      totalPages: order.total_pages,
      colorPages: order.color_pages,
      bwPages: order.bw_pages,
      price: parseFloat(order.price),
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    logger.info('Orders tracked by roll number', { rollNumber, count: orders.length });

    res.json({
      success: true,
      orders
    });
  } finally {
    client.release();
  }
}));

module.exports = router; 