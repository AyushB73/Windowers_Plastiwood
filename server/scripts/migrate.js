const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const createTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('owner', 'staff') NOT NULL DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Company info table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS company_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        logo TEXT,
        address TEXT,
        gstin VARCHAR(15),
        pan VARCHAR(10),
        phone VARCHAR(20),
        email VARCHAR(100),
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(11),
        branch VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        hsn VARCHAR(20),
        quantity INT DEFAULT 0,
        size VARCHAR(100),
        stock INT DEFAULT 0,
        color VARCHAR(50),
        color_code VARCHAR(7),
        price DECIMAL(10,2) DEFAULT 0.00,
        gst DECIMAL(5,2) DEFAULT 18.00,
        taxed_price DECIMAL(10,2) GENERATED ALWAYS AS (price * (1 + gst/100)) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Suppliers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gstin VARCHAR(15) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        total_amount DECIMAL(12,2) DEFAULT 0.00,
        last_transaction_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gstin VARCHAR(15) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        total_amount DECIMAL(12,2) DEFAULT 0.00,
        last_transaction_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Purchases table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_number VARCHAR(100) NOT NULL,
        supplier_gstin VARCHAR(15) NOT NULL,
        supplier_name VARCHAR(200) NOT NULL,
        supplier_phone VARCHAR(20),
        date DATE NOT NULL,
        due_date DATE,
        payment_method ENUM('cash', 'bank_transfer', 'cheque', 'credit', 'upi') DEFAULT 'cash',
        payment_status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
        total_amount DECIMAL(12,2) NOT NULL,
        receipt_file LONGTEXT,
        receipt_filename VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_gstin) REFERENCES suppliers(gstin) ON UPDATE CASCADE
      )
    `);

    // Purchase items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        hsn VARCHAR(20),
        qty INT NOT NULL,
        size VARCHAR(100),
        color VARCHAR(50),
        color_code VARCHAR(7),
        rate DECIMAL(10,2) NOT NULL,
        gst DECIMAL(5,2) DEFAULT 18.00,
        amount DECIMAL(10,2) GENERATED ALWAYS AS (qty * rate * (1 + gst/100)) STORED,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
      )
    `);

    // Sales/Invoices table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_gstin VARCHAR(15) NOT NULL,
        customer_name VARCHAR(200) NOT NULL,
        customer_phone VARCHAR(20),
        customer_email VARCHAR(100),
        customer_address TEXT,
        place_of_supply VARCHAR(100),
        date DATE NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        paid_amount DECIMAL(12,2) DEFAULT 0.00,
        pending_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
        status ENUM('paid', 'pending', 'partial') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_gstin) REFERENCES customers(gstin) ON UPDATE CASCADE
      )
    `);

    // Invoice items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        hsn VARCHAR(20),
        qty INT NOT NULL,
        rate DECIMAL(10,2) NOT NULL,
        gst DECIMAL(5,2) DEFAULT 18.00,
        amount DECIMAL(10,2) GENERATED ALWAYS AS (qty * rate * (1 + gst/100)) STORED,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    // Orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(200) NOT NULL,
        customer_phone VARCHAR(20),
        customer_email VARCHAR(100),
        shipping_address TEXT,
        order_date DATE NOT NULL,
        delivery_date DATE,
        status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
        total_amount DECIMAL(12,2) NOT NULL,
        invoice_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON SET NULL
      )
    `);

    // Order items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.execute(`
      INSERT IGNORE INTO users (username, name, email, password, role) 
      VALUES ('pramod', 'Pramod', 'pramod@plastiwood.com', ?, 'owner')
    `, [hashedPassword]);

    // Create default staff user
    const staffPassword = await bcrypt.hash('staff123', 10);
    await pool.execute(`
      INSERT IGNORE INTO users (username, name, email, password, role) 
      VALUES ('staff', 'Staff Member', 'staff@plastiwood.com', ?, 'staff')
    `, [staffPassword]);

    // Insert default company info
    await pool.execute(`
      INSERT IGNORE INTO company_info (id, name, address, gstin, pan, phone, email, bank_name, account_number, ifsc_code, branch) 
      VALUES (1, 'Windowers Plastiwood', 'Your Company Address', '22AAAAA0000A1Z5', 'AAAAA0000A', '+91-9876543210', 'info@windowers.com', 'State Bank of India', '1234567890', 'SBIN0001234', 'Main Branch')
    `);

    console.log('✅ Database migration completed successfully!');
    console.log('📝 Default users created:');
    console.log('   Owner: username=pramod, password=admin123');
    console.log('   Staff: username=staff, password=staff123');
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
};

module.exports = { createTables };