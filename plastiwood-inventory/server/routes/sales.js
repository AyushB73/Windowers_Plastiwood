const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all invoices/sales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [invoices] = await pool.execute(`
      SELECT i.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', ii.id,
                 'name', ii.name,
                 'hsn', ii.hsn,
                 'qty', ii.qty,
                 'rate', ii.rate,
                 'gst', ii.gst,
                 'amount', ii.amount
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      GROUP BY i.id
      ORDER BY i.date DESC, i.id DESC
    `);

    // Parse items JSON
    const parsedInvoices = invoices.map(invoice => ({
      ...invoice,
      items: invoice.items ? invoice.items.split(',').map(item => JSON.parse(item)) : []
    }));

    res.json(parsedInvoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create invoice/sale
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customer,
      placeOfSupply,
      date,
      items
    } = req.body;

    if (!customer || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.qty * item.rate * (1 + item.gst / 100));
    }, 0);

    // Insert or update customer
    await connection.execute(`
      INSERT INTO customers (gstin, name, phone, email, address, total_amount, last_transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        email = VALUES(email),
        address = VALUES(address),
        total_amount = total_amount + VALUES(total_amount),
        last_transaction_date = VALUES(last_transaction_date)
    `, [customer.gstin, customer.name, customer.phone || null, customer.email || null, customer.address || null, totalAmount, date]);

    // Insert invoice
    const [invoiceResult] = await connection.execute(`
      INSERT INTO invoices (
        customer_gstin, customer_name, customer_phone, customer_email, customer_address,
        place_of_supply, date, total_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      customer.gstin, customer.name, customer.phone || null, customer.email || null, 
      customer.address || null, placeOfSupply, date, totalAmount
    ]);

    const invoiceId = invoiceResult.insertId;

    // Insert invoice items
    for (const item of items) {
      await connection.execute(`
        INSERT INTO invoice_items (invoice_id, name, hsn, qty, rate, gst)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [invoiceId, item.name, item.hsn || null, item.qty, item.rate, item.gst || 18]);
    }

    // Create corresponding order
    const [orderResult] = await connection.execute(`
      INSERT INTO orders (
        customer_name, customer_phone, customer_email, shipping_address,
        order_date, status, total_amount, invoice_id
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [
      customer.name, customer.phone || null, customer.email || null, 
      customer.address || null, date, totalAmount, invoiceId
    ]);

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.execute(`
        INSERT INTO order_items (order_id, name, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.name, item.qty, item.rate]);
    }

    await connection.commit();

    // Return created invoice with items
    const [newInvoice] = await connection.execute(`
      SELECT i.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', ii.id,
                 'name', ii.name,
                 'hsn', ii.hsn,
                 'qty', ii.qty,
                 'rate', ii.rate,
                 'gst', ii.gst,
                 'amount', ii.amount
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = ?
      GROUP BY i.id
    `, [invoiceId]);

    const invoice = {
      ...newInvoice[0],
      items: newInvoice[0].items ? newInvoice[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.status(201).json(invoice);
  } catch (error) {
    await connection.rollback();
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Update invoice payment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, status } = req.body;

    await pool.execute(
      'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
      [paidAmount || 0, status, id]
    );

    // Return updated invoice
    const [updatedInvoice] = await pool.execute(`
      SELECT i.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', ii.id,
                 'name', ii.name,
                 'hsn', ii.hsn,
                 'qty', ii.qty,
                 'rate', ii.rate,
                 'gst', ii.gst,
                 'amount', ii.amount
               )
             ) as items
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = ?
      GROUP BY i.id
    `, [id]);

    const invoice = {
      ...updatedInvoice[0],
      items: updatedInvoice[0].items ? updatedInvoice[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete invoice (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM invoices WHERE id = ?', [id]);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customers
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    const [customers] = await pool.execute(
      'SELECT * FROM customers ORDER BY name ASC'
    );
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete customer (owner only)
router.delete('/customers/:gstin', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { gstin } = req.params;
    await pool.execute('DELETE FROM customers WHERE gstin = ?', [gstin]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;