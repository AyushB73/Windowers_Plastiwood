import { useState, useEffect } from 'react';
import { inventoryAPI, salesAPI, purchasesAPI, ordersAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalOrders: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    monthlyRevenue: 0,
    topProducts: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [inventory, sales, purchases, orders] = await Promise.all([
        inventoryAPI.getAll().catch(() => ({ items: [] })),
        salesAPI.getAll().catch(() => ({ invoices: [] })),
        purchasesAPI.getAll().catch(() => ({ purchases: [] })),
        ordersAPI.getAll().catch(() => ({ orders: [] }))
      ]);

      // Calculate stats
      const inventoryItems = inventory.items || [];
      const salesData = sales.invoices || [];
      const ordersData = orders.orders || [];

      // Basic stats
      const totalProducts = inventoryItems.length;
      const totalSales = salesData.length;
      const totalOrders = ordersData.length;
      
      // Revenue calculation
      const totalRevenue = salesData.reduce((sum, sale) => {
        return sum + (sale.total_amount || 0);
      }, 0);

      // Monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = salesData
        .filter(sale => {
          const saleDate = new Date(sale.invoice_date);
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((sum, sale) => sum + (sale.total_amount || 0), 0);

      // Low stock items (stock < 10)
      const lowStockItems = inventoryItems.filter(item => (item.stock || 0) < 10).length;

      // Pending orders
      const pendingOrders = ordersData.filter(order => order.status === 'pending').length;

      // Top products by sales
      const productSales = {};
      salesData.forEach(sale => {
        if (sale.items) {
          sale.items.forEach(item => {
            if (!productSales[item.product_name]) {
              productSales[item.product_name] = 0;
            }
            productSales[item.product_name] += item.quantity;
          });
        }
      });

      const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }));

      setStats({
        totalProducts,
        totalSales,
        totalRevenue,
        totalOrders,
        lowStockItems,
        pendingOrders,
        monthlyRevenue,
        topProducts
      });

      // Recent activity
      const activities = [];
      
      // Add recent sales
      salesData.slice(-5).forEach(sale => {
        activities.push({
          type: 'sale',
          description: `Sale invoice #${sale.invoice_number} - ₹${sale.total_amount?.toLocaleString('en-IN')}`,
          date: sale.invoice_date,
          amount: sale.total_amount
        });
      });

      // Add recent orders
      ordersData.slice(-3).forEach(order => {
        activities.push({
          type: 'order',
          description: `New order #${order.order_number} from ${order.customer_name}`,
          date: order.order_date,
          status: order.status
        });
      });

      // Sort by date
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(activities.slice(0, 8));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set default stats if API fails
      setStats({
        totalProducts: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalOrders: 0,
        lowStockItems: 0,
        pendingOrders: 0,
        monthlyRevenue: 0,
        topProducts: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to Windowers Plastiwood Inventory Management</p>
        <button onClick={loadDashboardData} className="refresh-btn">
          🔄 Refresh Data
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">₹</div>
          <div className="stat-content">
            <h3>₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{stats.lowStockItems}</h3>
            <p>Low Stock Items</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>₹{stats.monthlyRevenue.toLocaleString('en-IN')}</h3>
            <p>This Month</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>{stats.topProducts.length}</h3>
            <p>Top Products</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-row">
          <div className="dashboard-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className={`activity-item ${activity.type}`}>
                    <div className="activity-icon">
                      {activity.type === 'sale' ? '💰' : '📋'}
                    </div>
                    <div className="activity-content">
                      <p>{activity.description}</p>
                      <small>{new Date(activity.date).toLocaleDateString('en-IN')}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No recent activity</p>
              )}
            </div>
          </div>

          <div className="dashboard-section">
            <h3>Top Selling Products</h3>
            <div className="top-products">
              {stats.topProducts.length > 0 ? (
                stats.topProducts.map((product, index) => (
                  <div key={index} className="product-item">
                    <span className="product-rank">#{index + 1}</span>
                    <div className="product-info">
                      <p className="product-name">{product.name}</p>
                      <small>{product.quantity} units sold</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data">No sales data available</p>
              )}
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-btn" onClick={() => window.location.hash = '#inventory'}>
              📦 Manage Inventory
            </button>
            <button className="action-btn" onClick={() => window.location.hash = '#sales'}>
              💰 Create Sale
            </button>
            <button className="action-btn" onClick={() => window.location.hash = '#purchases'}>
              🛒 Add Purchase
            </button>
            <button className="action-btn" onClick={() => window.location.hash = '#orders'}>
              📋 View Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
