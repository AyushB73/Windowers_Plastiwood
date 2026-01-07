const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'total', oi.total
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.order_date DESC, o.id DESC
    `);

    // Parse items JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: order.items ? order.items.split(',').map(item => JSON.parse(item)) : []
    }));

    res.json(parsedOrders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      orderDate,
      deliveryDate,
      items
    } = req.body;

    if (!customerName || !orderDate || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);

    // Insert order
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (
        customer_name, customer_phone, customer_email, shipping_address,
        order_date, delivery_date, status, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      customerName, customerPhone || null, customerEmail || null, 
      shippingAddress || null, orderDate, deliveryDate || null, totalAmount
    ]);

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.execute(`
        INSERT INTO order_items (order_id, name, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.name, item.quantity, item.price]);
    }

    await connection.commit();

    // Return created order with items
    const [newOrder] = await connection.execute(`
      SELECT o.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'total', oi.total
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `, [orderId]);

    const order = {
      ...newOrder[0],
      items: newOrder[0].items ? newOrder[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.status(201).json(order);
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Update order
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryDate } = req.body;

    await pool.execute(
      'UPDATE orders SET status = ?, delivery_date = ? WHERE id = ?',
      [status, deliveryDate || null, id]
    );

    // Return updated order
    const [updatedOrder] = await pool.execute(`
      SELECT o.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', oi.id,
                 'name', oi.name,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'total', oi.total
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `, [id]);

    const order = {
      ...updatedOrder[0],
      items: updatedOrder[0].items ? updatedOrder[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete order (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;