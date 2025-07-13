const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { pool } = require('../config/db');
const crypto = require('crypto');

const router = express.Router();

// Get payment settings
const getPaymentSettings = async () => {
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

    return {
      paymentEnabled: settings.payment_enabled === 'true',
      paytmMerchantId: settings.paytm_merchant_id || '',
      paytmMerchantKey: settings.paytm_merchant_key || '',
      paytmEnvironment: settings.paytm_environment || 'TEST'
    };
  } finally {
    client.release();
  }
};

// Generate Paytm checksum
const generatePaytmChecksum = (params, merchantKey) => {
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {});

  const checksumString = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&') + merchantKey;

  return crypto.createHash('sha256').update(checksumString).digest('hex');
};

// Process payment
router.post('/process', 
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
    body('rollNumber').notEmpty().withMessage('Roll number is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { orderId, amount, rollNumber } = req.body;

    try {
      // Get payment settings
      const paymentSettings = await getPaymentSettings();
      
      if (!paymentSettings.paymentEnabled) {
        return res.status(400).json({ 
          error: 'Payment processing is currently disabled' 
        });
      }

      if (!paymentSettings.paytmMerchantId) {
        return res.status(400).json({ 
          error: 'Paytm merchant ID not configured' 
        });
      }

      // Generate unique transaction ID
      const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare Paytm parameters
      const paytmParams = {
        MID: paymentSettings.paytmMerchantId,
        ORDER_ID: orderId,
        TXN_AMOUNT: amount.toString(),
        CUST_ID: rollNumber,
        TXN_ID: txnId,
        CHANNEL_ID: 'WEB',
        WEBSITE: paymentSettings.paytmEnvironment === 'PROD' ? 'DEFAULT' : 'WEBSTAGING',
        CALLBACK_URL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payment/callback`,
        INDUSTRY_TYPE_ID: 'Retail',
        CHECKSUMHASH: ''
      };

      // Generate checksum
      const checksum = generatePaytmChecksum(paytmParams, paymentSettings.paytmMerchantKey);
      paytmParams.CHECKSUMHASH = checksum;

      // Determine Paytm URL based on environment
      const paytmUrl = paymentSettings.paytmEnvironment === 'PROD' 
        ? 'https://securegw.paytm.in/order/process'
        : 'https://securegw-stage.paytm.in/order/process';

      // Update order with payment info
      const client = await pool.connect();
      try {
        await client.query(`
          UPDATE orders 
          SET payment_status = 'pending', payment_id = $1
          WHERE token = $2
        `, [txnId, orderId]);
      } finally {
        client.release();
      }

      logger.info('Payment initiated', { 
        orderId, 
        amount, 
        txnId, 
        environment: paymentSettings.paytmEnvironment 
      });

      res.json({
        success: true,
        paymentId: txnId,
        paytmUrl,
        paytmParams,
        message: 'Payment initiated successfully'
      });
    } catch (error) {
      logger.error('Payment processing error:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  })
);

// Payment callback
router.post('/callback', asyncHandler(async (req, res) => {
  const { ORDERID, TXNID, TXNAMOUNT, STATUS, CHECKSUMHASH } = req.body;
  
  try {
    // Get payment settings for verification
    const paymentSettings = await getPaymentSettings();
    
    // Verify checksum
    const receivedChecksum = CHECKSUMHASH;
    const calculatedChecksum = generatePaytmChecksum({
      ORDERID,
      TXNID,
      TXNAMOUNT,
      STATUS
    }, paymentSettings.paytmMerchantKey);

    if (receivedChecksum !== calculatedChecksum) {
      logger.error('Payment callback checksum mismatch', { ORDERID, TXNID });
      return res.status(400).json({ error: 'Invalid checksum' });
    }

    // Update order status
    const client = await pool.connect();
    try {
      const paymentStatus = STATUS === 'TXN_SUCCESS' ? 'paid' : 'failed';
      
      await client.query(`
        UPDATE orders 
        SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE token = $2
      `, [paymentStatus, ORDERID]);

      logger.info('Payment callback processed', { 
        ORDERID, 
        TXNID, 
        STATUS, 
        paymentStatus 
      });
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Payment callback error:', error);
    res.status(500).json({ error: 'Payment callback processing failed' });
  }
}));

// Verify payment
router.get('/verify/:paymentId', asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT payment_status, price, token
        FROM orders 
        WHERE payment_id = $1
      `, [paymentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const order = result.rows[0];
      
      res.json({
        success: true,
        paymentId,
        status: order.payment_status,
        amount: parseFloat(order.price),
        orderToken: order.token,
        verified: true
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
}));

module.exports = router; 