const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get daily report
router.get('/daily', authenticateAdmin, asyncHandler(async (req, res) => {
  const { date } = req.query;
  const reportDate = date || new Date().toISOString().split('T')[0];
  const client = await pool.connect();

  try {
    // Get orders for the specified date
    const ordersResult = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_pages) as total_pages,
        SUM(color_pages) as color_pages,
        SUM(bw_pages) as bw_pages,
        SUM(price) as total_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders
      FROM orders 
      WHERE DATE(created_at) = $1
    `, [reportDate]);

    // Get hourly breakdown
    const hourlyResult = await client.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as orders,
        SUM(price) as revenue
      FROM orders 
      WHERE DATE(created_at) = $1
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [reportDate]);

    const report = {
      date: reportDate,
      summary: ordersResult.rows[0],
      hourlyBreakdown: hourlyResult.rows
    };

    logger.info('Daily report generated', { date: reportDate });

    res.json({
      success: true,
      report
    });
  } finally {
    client.release();
  }
}));

// Get monthly report
router.get('/monthly', authenticateAdmin, asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const currentDate = new Date();
  const reportYear = year || currentDate.getFullYear();
  const reportMonth = month || currentDate.getMonth() + 1;
  const client = await pool.connect();

  try {
    // Get monthly summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_pages) as total_pages,
        SUM(color_pages) as color_pages,
        SUM(bw_pages) as bw_pages,
        SUM(price) as total_revenue,
        AVG(price) as average_order_value,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders
      FROM orders 
      WHERE EXTRACT(YEAR FROM created_at) = $1 
      AND EXTRACT(MONTH FROM created_at) = $2
    `, [reportYear, reportMonth]);

    // Get daily breakdown
    const dailyResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_pages) as pages,
        SUM(price) as revenue
      FROM orders 
      WHERE EXTRACT(YEAR FROM created_at) = $1 
      AND EXTRACT(MONTH FROM created_at) = $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [reportYear, reportMonth]);

    const report = {
      year: reportYear,
      month: reportMonth,
      summary: summaryResult.rows[0],
      dailyBreakdown: dailyResult.rows
    };

    logger.info('Monthly report generated', { year: reportYear, month: reportMonth });

    res.json({
      success: true,
      report
    });
  } finally {
    client.release();
  }
}));

// Get revenue report
router.get('/revenue', authenticateAdmin, asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const client = await pool.connect();

  try {
    const revenueResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(price) as revenue,
        AVG(price) as average_order_value,
        SUM(total_pages) as total_pages,
        SUM(color_pages) as color_pages,
        SUM(bw_pages) as bw_pages
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const totalRevenue = revenueResult.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
    const totalOrders = revenueResult.rows.reduce((sum, row) => sum + parseInt(row.orders), 0);

    const report = {
      period: `${period} days`,
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      dailyData: revenueResult.rows
    };

    logger.info('Revenue report generated', { period });

    res.json({
      success: true,
      report
    });
  } finally {
    client.release();
  }
}));

// Export report as CSV
router.get('/export/:type', authenticateAdmin, asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { date, year, month } = req.query;
  const client = await pool.connect();

  try {
    let query;
    let params;

    switch (type) {
      case 'daily':
        const reportDate = date || new Date().toISOString().split('T')[0];
        query = `
          SELECT 
            token, roll_number, total_pages, color_pages, bw_pages, 
            price, status, created_at
          FROM orders 
          WHERE DATE(created_at) = $1
          ORDER BY created_at DESC
        `;
        params = [reportDate];
        break;

      case 'monthly':
        const currentDate = new Date();
        const reportYear = year || currentDate.getFullYear();
        const reportMonth = month || currentDate.getMonth() + 1;
        query = `
          SELECT 
            token, roll_number, total_pages, color_pages, bw_pages, 
            price, status, created_at
          FROM orders 
          WHERE EXTRACT(YEAR FROM created_at) = $1 
          AND EXTRACT(MONTH FROM created_at) = $2
          ORDER BY created_at DESC
        `;
        params = [reportYear, reportMonth];
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const result = await client.query(query, params);

    // Convert to CSV format
    const csvHeaders = 'Token,Roll Number,Total Pages,Color Pages,B&W Pages,Price,Status,Created At\n';
    const csvData = result.rows.map(row => 
      `${row.token},${row.roll_number},${row.total_pages},${row.color_pages},${row.bw_pages},${row.price},${row.status},${row.created_at}`
    ).join('\n');

    const csvContent = csvHeaders + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

    logger.info('Report exported', { type, rows: result.rows.length });
  } finally {
    client.release();
  }
}));

module.exports = router; 