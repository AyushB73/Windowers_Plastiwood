const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all purchases
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [purchases] = await pool.execute(`
      SELECT p.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', pi.id,
                 'name', pi.name,
                 'hsn', pi.hsn,
                 'qty', pi.qty,
                 'size', pi.size,
                 'color', pi.color,
                 'color_code', pi.color_code,
                 'rate', pi.rate,
                 'gst', pi.gst,
                 'amount', pi.amount
               )
             ) as items
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      GROUP BY p.id
      ORDER BY p.date DESC, p.id DESC
    `);

    // Parse items JSON
    const parsedPurchases = purchases.map(purchase => ({
      ...purchase,
      items: purchase.items ? purchase.items.split(',').map(item => JSON.parse(item)) : []
    }));

    res.json(parsedPurchases);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create purchase
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      billNumber,
      supplier,
      date,
      dueDate,
      paymentMethod,
      paymentStatus,
      items,
      receiptFile,
      receiptFilename
    } = req.body;

    if (!billNumber || !supplier || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.qty * item.rate * (1 + item.gst / 100));
    }, 0);

    // Insert or update supplier
    await connection.execute(`
      INSERT INTO suppliers (gstin, name, phone, total_amount, last_transaction_date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        total_amount = total_amount + VALUES(total_amount),
        last_transaction_date = VALUES(last_transaction_date)
    `, [supplier.gstin, supplier.name, supplier.phone || null, totalAmount, date]);

    // Insert purchase
    const [purchaseResult] = await connection.execute(`
      INSERT INTO purchases (
        bill_number, supplier_gstin, supplier_name, supplier_phone, date, due_date,
        payment_method, payment_status, total_amount, receipt_file, receipt_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      billNumber, supplier.gstin, supplier.name, supplier.phone || null, date, dueDate || null,
      paymentMethod, paymentStatus, totalAmount, receiptFile || null, receiptFilename || null
    ]);

    const purchaseId = purchaseResult.insertId;

    // Insert purchase items and update inventory
    for (const item of items) {
      // Insert purchase item
      await connection.execute(`
        INSERT INTO purchase_items (purchase_id, name, hsn, qty, size, color, color_code, rate, gst)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [purchaseId, item.name, item.hsn || null, item.qty, item.size || null, item.color || null, item.colorCode || null, item.rate, item.gst || 18]);

      // Check if item exists in inventory
      const [existingItems] = await connection.execute(
        'SELECT id, stock FROM inventory WHERE name = ? AND hsn = ?',
        [item.name, item.hsn || '']
      );

      if (existingItems.length > 0) {
        // Update existing inventory item
        const existingItem = existingItems[0];
        await connection.execute(
          'UPDATE inventory SET stock = stock + ?, color = ?, color_code = ?, price = ?, gst = ? WHERE id = ?',
          [item.qty, item.color || null, item.colorCode || null, item.rate, item.gst || 18, existingItem.id]
        );
      } else {
        // Create new inventory item
        await connection.execute(`
          INSERT INTO inventory (name, hsn, quantity, size, stock, color, color_code, price, gst)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [item.name, item.hsn || null, item.qty, item.size || null, item.qty, item.color || null, item.colorCode || null, item.rate, item.gst || 18]);
      }
    }

    await connection.commit();

    // Return created purchase with items
    const [newPurchase] = await connection.execute(`
      SELECT p.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', pi.id,
                 'name', pi.name,
                 'hsn', pi.hsn,
                 'qty', pi.qty,
                 'size', pi.size,
                 'color', pi.color,
                 'color_code', pi.color_code,
                 'rate', pi.rate,
                 'gst', pi.gst,
                 'amount', pi.amount
               )
             ) as items
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [purchaseId]);

    const purchase = {
      ...newPurchase[0],
      items: newPurchase[0].items ? newPurchase[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.status(201).json(purchase);
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// Update purchase
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod } = req.body;

    await pool.execute(
      'UPDATE purchases SET payment_status = ?, payment_method = ? WHERE id = ?',
      [paymentStatus, paymentMethod, id]
    );

    // Return updated purchase
    const [updatedPurchase] = await pool.execute(`
      SELECT p.*, 
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', pi.id,
                 'name', pi.name,
                 'hsn', pi.hsn,
                 'qty', pi.qty,
                 'size', pi.size,
                 'color', pi.color,
                 'color_code', pi.color_code,
                 'rate', pi.rate,
                 'gst', pi.gst,
                 'amount', pi.amount
               )
             ) as items
      FROM purchases p
      LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]);

    const purchase = {
      ...updatedPurchase[0],
      items: updatedPurchase[0].items ? updatedPurchase[0].items.split(',').map(item => JSON.parse(item)) : []
    };

    res.json(purchase);
  } catch (error) {
    console.error('Update purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete purchase (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM purchases WHERE id = ?', [id]);
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get suppliers
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await pool.execute(
      'SELECT * FROM suppliers ORDER BY name ASC'
    );
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supplier (owner only)
router.delete('/suppliers/:gstin', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { gstin } = req.params;
    await pool.execute('DELETE FROM suppliers WHERE gstin = ?', [gstin]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;