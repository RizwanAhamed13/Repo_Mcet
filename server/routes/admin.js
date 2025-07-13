const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { pool, logAuditTrail } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { listCurrentFiles } = require('../config/localStorage');

const router = express.Router();

// Get all orders (admin only)
router.get('/orders', authenticateAdmin, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  const client = await pool.connect();

  try {
    let query = `
      SELECT id, token, roll_number, total_pages, color_pages, bw_pages, 
             price, status, payment_status, created_at, updated_at
      FROM orders
    `;
    const params = [];

    if (status) {
      query += ` WHERE status = $1`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await client.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders';
    if (status) {
      countQuery += ' WHERE status = $1';
    }
    const countResult = await client.query(countQuery, status ? [status] : []);

    const orders = result.rows.map(order => ({
      id: order.id,
      token: order.token,
      rollNumber: order.roll_number,
      totalPages: order.total_pages,
      colorPages: order.color_pages,
      bwPages: order.bw_pages,
      price: parseFloat(order.price),
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    }));

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } finally {
    client.release();
  }
}));

// Get current files in uploads directory (admin only)
router.get('/files', authenticateAdmin, asyncHandler(async (req, res) => {
  try {
    const files = await listCurrentFiles();
    
    res.json({
      success: true,
      files: files.map(file => ({
        name: file.name,
        size: file.size,
        modified: file.modified,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
      }))
    });
  } catch (error) {
    logger.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
}));

// Get order details (admin only)
router.get('/orders/:id', authenticateAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, token, roll_number, file_name, total_pages, color_pages, bw_pages, 
             price, status, payment_status, created_at, updated_at, print_options
      FROM orders 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    res.json({
      success: true,
      order: {
        id: order.id,
        token: order.token,
        rollNumber: order.roll_number,
        fileName: order.file_name,
        totalPages: order.total_pages,
        colorPages: order.color_pages,
        bwPages: order.bw_pages,
        price: parseFloat(order.price),
        status: order.status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        printOptions: order.print_options ? JSON.parse(order.print_options) : {}
      }
    });
  } finally {
    client.release();
  }
}));

// Update order status (admin only)
router.put('/orders/:id', authenticateAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  const client = await pool.connect();

  try {
    // Get current order data
    const currentResult = await client.query(
      'SELECT status, payment_status FROM orders WHERE id = $1',
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = currentResult.rows[0].status;
    const oldPaymentStatus = currentResult.rows[0].payment_status;

    // Update order status and payment status
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (paymentStatus !== undefined) {
      updateFields.push(`payment_status = $${paramIndex++}`);
      updateValues.push(paymentStatus);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    const result = await client.query(query, updateValues);

    // Log audit trail
    await logAuditTrail('update_order', 'orders', id, 
      { status: oldStatus, paymentStatus: oldPaymentStatus }, 
      { status, paymentStatus }, 
      req
    );

    logger.info('Order updated', { 
      orderId: id, 
      oldStatus, 
      newStatus: status,
      oldPaymentStatus,
      newPaymentStatus: paymentStatus
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: result.rows[0]
    });
  } finally {
    client.release();
  }
}));

// Get payment settings (admin only)
router.get('/payment-settings', authenticateAdmin, asyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key LIKE 'payment_%'
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({
      success: true,
      settings: {
        paymentEnabled: settings.payment_enabled === 'true',
        paytmMerchantId: settings.paytm_merchant_id || '',
        paytmMerchantKey: settings.paytm_merchant_key || '',
        paytmEnvironment: settings.paytm_environment || 'TEST'
      }
    });
  } finally {
    client.release();
  }
}));

// Update payment settings (admin only)
router.put('/payment-settings', authenticateAdmin, asyncHandler(async (req, res) => {
  const { paymentEnabled, paytmMerchantId, paytmMerchantKey, paytmEnvironment } = req.body;
  const client = await pool.connect();

  try {
    // Update payment settings
    const settings = [
      { key: 'payment_enabled', value: paymentEnabled ? 'true' : 'false' },
      { key: 'paytm_merchant_id', value: paytmMerchantId || '' },
      { key: 'paytm_merchant_key', value: paytmMerchantKey || '' },
      { key: 'paytm_environment', value: paytmEnvironment || 'TEST' }
    ];

    for (const setting of settings) {
      await client.query(`
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [setting.key, setting.value]);
    }

    // Log audit trail
    await logAuditTrail('update_payment_settings', 'system_settings', null, 
      null, 
      { paymentEnabled, paytmMerchantId, paytmEnvironment }, 
      req
    );

    logger.info('Payment settings updated', { 
      paymentEnabled, 
      paytmEnvironment,
      updatedBy: req.user.id 
    });

    res.json({
      success: true,
      message: 'Payment settings updated successfully'
    });
  } finally {
    client.release();
  }
}));

// Get payment statistics (admin only)
router.get('/payment-stats', authenticateAdmin, asyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN price ELSE 0 END) as total_revenue
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const result = stats.rows[0];

    res.json({
      success: true,
      stats: {
        totalOrders: parseInt(result.total_orders),
        paidOrders: parseInt(result.paid_orders),
        pendingOrders: parseInt(result.pending_orders),
        failedOrders: parseInt(result.failed_orders),
        totalRevenue: parseFloat(result.total_revenue || 0),
        conversionRate: result.total_orders > 0 ? 
          ((result.paid_orders / result.total_orders) * 100).toFixed(2) : 0
      }
    });
  } finally {
    client.release();
  }
}));

module.exports = router; 