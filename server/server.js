const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { createTables } = require('./scripts/migrate');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const purchaseRoutes = require('./routes/purchases');
const salesRoutes = require('./routes/sales');
const orderRoutes = require('./routes/orders');
const companyRoutes = require('./routes/company');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://*.railway.app']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  console.log('📁 Serving static files from:', distPath);
  app.use(express.static(distPath));
  
  // Check if dist folder exists
  const fs = require('fs');
  if (fs.existsSync(distPath)) {
    console.log('✅ dist folder found');
    const files = fs.readdirSync(distPath);
    console.log('📄 Files in dist:', files);
  } else {
    console.log('❌ dist folder not found');
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/company', companyRoutes);

// Serve React app for all non-API routes (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('🔍 Serving index.html from:', indexPath);
    
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.log('❌ index.html not found');
      res.status(404).send(`
        <h1>Frontend Not Built</h1>
        <p>The React frontend was not built properly.</p>
        <p>Expected file: ${indexPath}</p>
        <p><a href="/health">Check server health</a></p>
      `);
    }
  });
} else {
  // Development mode - show helpful message
  app.get('*', (req, res) => {
    res.send(`
      <h1>Development Mode</h1>
      <p>Server is running in development mode.</p>
      <p><a href="/health">Check server health</a></p>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      // Run migration only if database is connected
      console.log('🗄️ Running database migration...');
      const migrationSuccess = await createTables();
      
      if (!migrationSuccess) {
        console.log('⚠️ Migration failed, but continuing to start server...');
      }
    } else {
      console.log('⚠️ Database not connected, skipping migration. Server will start anyway.');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      if (!dbConnected) {
        console.log('⚠️ Database connection failed - please check environment variables');
        console.log('Required variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit, just start the server anyway
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} (with errors)`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
};

startServer();