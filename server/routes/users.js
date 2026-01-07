const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (owner only)
router.get('/', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (owner only)
router.post('/', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { username, name, email, phone, password, role } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({ error: 'Username, name, and password are required' });
    }

    // Check if username already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (username, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, name, email || null, phone || null, hashedPassword, role || 'staff']
    );

    // Return created user (without password)
    const [newUser] = await pool.execute(
      'SELECT id, username, name, email, phone, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, name, email, phone, password } = req.body;

    // Check if user can update this record
    if (req.user.role !== 'owner' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Can only update your own profile' });
    }

    let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?';
    let updateParams = [name, email || null, phone || null];

    // If username is being updated (owner only)
    if (username && req.user.role === 'owner') {
      updateQuery = 'UPDATE users SET username = ?, name = ?, email = ?, phone = ?';
      updateParams = [username, name, email || null, phone || null];
    }

    // If password is being updated
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await pool.execute(updateQuery, updateParams);

    // Return updated user
    const [updatedUser] = await pool.execute(
      'SELECT id, username, name, email, phone, role, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (owner only)
router.delete('/:id', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;