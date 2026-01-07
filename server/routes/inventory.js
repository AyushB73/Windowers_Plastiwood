const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.execute(
      'SELECT * FROM inventory ORDER BY name ASC'
    );
    res.json(items);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create inventory item (owner only)
router.post('/', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { name, hsn, quantity, size, stock, color, color_code, price, gst } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const [result] = await pool.execute(
      `INSERT INTO inventory (name, hsn, quantity, size, stock, color, color_code, price, gst) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, hsn || null, quantity || 0, size || null, stock || 0, color || null, color_code || null, price || 0, gst || 18]
    );

    // Return created item
    const [newItem] = await pool.execute(
      'SELECT * FROM inventory WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory item (owner only)
router.put('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hsn, quantity, size, stock, color, color_code, price, gst } = req.body;

    await pool.execute(
      `UPDATE inventory SET name = ?, hsn = ?, quantity = ?, size = ?, stock = ?, 
       color = ?, color_code = ?, price = ?, gst = ? WHERE id = ?`,
      [name, hsn || null, quantity || 0, size || null, stock || 0, color || null, color_code || null, price || 0, gst || 18, id]
    );

    // Return updated item
    const [updatedItem] = await pool.execute(
      'SELECT * FROM inventory WHERE id = ?',
      [id]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory stock (for purchases)
router.patch('/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    await pool.execute(
      'UPDATE inventory SET stock = ? WHERE id = ?',
      [stock, id]
    );

    const [updatedItem] = await pool.execute(
      'SELECT * FROM inventory WHERE id = ?',
      [id]
    );

    res.json(updatedItem[0]);
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete inventory item (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM inventory WHERE id = ?', [id]);
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;