# Railway Deployment Guide

## Prerequisites
1. Railway account (https://railway.app)
2. GitHub repository with your code

## Step 1: Set up MySQL Database on Railway

1. Go to Railway dashboard
2. Click "New Project" → "Provision MySQL"
3. Note down the database connection details:
   - `MYSQL_HOST`
   - `MYSQL_PORT` 
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

## Step 2: Deploy Backend

1. In Railway, click "New Service" → "GitHub Repo"
2. Select your repository
3. Set the following environment variables:
   ```
   DB_HOST=your-mysql-host
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your-mysql-password
   DB_NAME=railway
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.railway.app
   ```
4. Set the start command: `cd server && npm start`
5. Deploy and note the backend URL

## Step 3: Update Frontend API URL

1. Update `src/services/api.js`:
   ```javascript
   const API_BASE_URL = import.meta.env.PROD 
     ? 'https://your-backend-url.railway.app/api'  // Your actual Railway backend URL
     : 'http://localhost:3001/api';
   ```

## Step 4: Deploy Frontend

1. Create another service in Railway for frontend
2. Set build command: `npm run build`
3. Set start command: `npm run preview`
4. Deploy

## Step 5: Run Database Migration

1. In Railway backend service, go to "Deployments"
2. Click on latest deployment
3. Go to "Logs" and verify migration ran successfully
4. Or manually run: `cd server && npm run migrate`

## Default Login Credentials

After migration, you can login with:
- **Owner**: username=`pramod`, password=`admin123`
- **Staff**: username=`staff`, password=`staff123`

## Environment Variables Reference

### Backend (.env)
```
DB_HOST=your-railway-mysql-host
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=railway
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.railway.app
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_APP_NAME=Windowers Plastiwood
```

## Database Schema

The migration script will create the following tables:
- `users` - User accounts (owner/staff)
- `company_info` - Company details
- `inventory` - Product inventory
- `suppliers` - Supplier information
- `customers` - Customer information  
- `purchases` - Purchase records
- `purchase_items` - Purchase line items
- `invoices` - Sales invoices
- `invoice_items` - Invoice line items
- `orders` - Customer orders
- `order_items` - Order line items

## Features

✅ **Multi-user Authentication** - Owner and Staff roles
✅ **Real-time Data Sync** - All users see same data
✅ **Persistent Sessions** - Stay logged in across devices
✅ **Role-based Access** - Owner has full access, Staff has limited access
✅ **MySQL Database** - Professional data storage
✅ **RESTful API** - Clean backend architecture
✅ **Production Ready** - Deployed on Railway

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users (Owner only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Inventory
- `GET /api/inventory` - Get all items
- `POST /api/inventory` - Create item (Owner only)
- `PUT /api/inventory/:id` - Update item (Owner only)
- `DELETE /api/inventory/:id` - Delete item (Owner only)

### Purchases
- `GET /api/purchases` - Get all purchases
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase (Owner only)

### Sales
- `GET /api/sales` - Get all invoices
- `POST /api/sales` - Create invoice
- `PUT /api/sales/:id` - Update invoice
- `DELETE /api/sales/:id` - Delete invoice (Owner only)

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order (Owner only)

### Company
- `GET /api/company` - Get company info
- `PUT /api/company` - Update company info (Owner only)