const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get company info
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [companies] = await pool.execute(
      'SELECT * FROM company_info WHERE id = 1'
    );
    
    if (companies.length === 0) {
      return res.json({
        id: 1,
        name: 'Windowers Plastiwood',
        logo: '',
        address: '',
        gstin: '',
        pan: '',
        phone: '',
        email: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch: ''
      });
    }
    
    res.json(companies[0]);
  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update company info (owner only)
router.put('/', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const {
      name, logo, address, gstin, pan, phone, email,
      bank_name, account_number, ifsc_code, branch
    } = req.body;

    await pool.execute(`
      INSERT INTO company_info (
        id, name, logo, address, gstin, pan, phone, email,
        bank_name, account_number, ifsc_code, branch
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        logo = VALUES(logo),
        address = VALUES(address),
        gstin = VALUES(gstin),
        pan = VALUES(pan),
        phone = VALUES(phone),
        email = VALUES(email),
        bank_name = VALUES(bank_name),
        account_number = VALUES(account_number),
        ifsc_code = VALUES(ifsc_code),
        branch = VALUES(branch)
    `, [
      name, logo || null, address || null, gstin || null, pan || null,
      phone || null, email || null, bank_name || null, account_number || null,
      ifsc_code || null, branch || null
    ]);

    // Return updated company info
    const [updatedCompany] = await pool.execute(
      'SELECT * FROM company_info WHERE id = 1'
    );

    res.json(updatedCompany[0]);
  } catch (error) {
    console.error('Update company info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;