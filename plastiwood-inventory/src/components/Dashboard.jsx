import { useState, useEffect } from 'react';
import { useDataSync, useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import './Dashboard.css';

const Dashboard = () => {
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Use synchronized data
  const { data: inventory } = useDataSync(DATA_KEYS.INVENTORY, []);
  const { data: purchases } = useDataSync(DATA_KEYS.PURCHASES, []);
  const { data: sales } = useDataSync(DATA_KEYS.INVOICES, []);
  const { data: orders } = useDataSync(DATA_KEYS.ORDERS, []);
  const { data: suppliers } = useObjectDataSync(DATA_KEYS.SUPPLIERS, {});
  const { data: customers } = useObjectDataSync(DATA_KEYS.CUSTOMERS, {});
  const { data: companyInfo } = useObjectDataSync(DATA_KEYS.COMPANY_INFO, {});

  // Filter data based on time period or custom date
  const filterDataByPeriod = (data, dateField) => {
    const now = new Date();
    
    // If custom date is selected, filter by that specific date
    if (useCustomDate && selectedDate) {
      const customDate = new Date(selectedDate);
      const startOfCustomDay = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
      const endOfCustomDay = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate() + 1);
      
      return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= startOfCustomDay && itemDate < endOfCustomDay;
      });
    }
    
    // Otherwise use the existing time period logic
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let startDate;
    switch (timePeriod) {
      case 'daily':
        startDate = startOfDay;
        break;
      case 'weekly':
        startDate = startOfWeek;
        break;
      case 'monthly':
        startDate = startOfMonth;
        break;
      case 'quarterly':
        startDate = startOfQuarter;
        break;
      case 'yearly':
        startDate = startOfYear;
        break;
      default:
        return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate;
    });
  };

  // Calculate statistics with time period filtering
  const calculateStats = () => {
    // Filter data based on selected time period
    const filteredSales = filterDataByPeriod(sales, 'date');
    const filteredPurchases = filterDataByPeriod(purchases, 'date');
    const filteredOrders = filterDataByPeriod(orders, 'orderDate');

    // Inventory stats (not time-filtered as it's current state)
    const totalProducts = inventory.length;
    const lowStockItems = inventory.filter(item => (item.stock || 0) < 20).length;
    const outOfStockItems = inventory.filter(item => (item.stock || 0) === 0).length;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0);

    // Sales stats (time-filtered)
    const totalSales = filteredSales.length;
    const paidSales = filteredSales.filter(sale => sale.status === 'paid').length;
    const pendingSales = filteredSales.filter(sale => sale.status === 'pending').length;
    const totalRevenue = filteredSales.reduce((sum, sale) => {
      if (!sale.items) return sum;
      const saleTotal = sale.items.reduce((itemSum, item) => {
        return itemSum + (item.qty * item.rate * (1 + item.gst / 100));
      }, 0);
      return sum + saleTotal;
    }, 0);

    // Purchase stats (time-filtered)
    const totalPurchases = filteredPurchases.length;
    const paidPurchases = filteredPurchases.filter(purchase => purchase.paymentStatus === 'paid').length;
    const pendingPurchases = filteredPurchases.filter(purchase => purchase.paymentStatus === 'pending').length;
    const overduePurchases = filteredPurchases.filter(purchase => purchase.paymentStatus === 'overdue').length;
    const totalPurchaseAmount = filteredPurchases.reduce((sum, purchase) => {
      if (!purchase.items) return sum;
      const purchaseTotal = purchase.items.reduce((itemSum, item) => {
        return itemSum + (item.qty * item.rate * (1 + item.gst / 100));
      }, 0);
      return sum + purchaseTotal;
    }, 0);

    // Order stats (time-filtered)
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
    const completedOrders = filteredOrders.filter(order => order.status === 'completed').length;
    const processingOrders = filteredOrders.filter(order => order.status === 'processing').length;

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalInventoryValue,
      totalSales,
      paidSales,
      pendingSales,
      totalRevenue,
      totalPurchases,
      paidPurchases,
      pendingPurchases,
      overduePurchases,
      totalPurchaseAmount,
      totalOrders,
      pendingOrders,
      completedOrders,
      processingOrders,
      totalSuppliers: Object.keys(suppliers).length,
      totalCustomers: Object.keys(customers).length
    };
  };

  const stats = calculateStats();

  // Get recent activity with time period filtering
  const getRecentActivity = () => {
    const activities = [];

    // Filter data based on time period
    const filteredSales = filterDataByPeriod(sales, 'date');
    const filteredPurchases = filterDataByPeriod(purchases, 'date');
    const filteredOrders = filterDataByPeriod(orders, 'orderDate');

    // Recent sales
    filteredSales.slice(0, 3).forEach(sale => {
      activities.push({
        id: `sale-${sale.id}`,
        action: 'New invoice generated',
        details: `Invoice ${sale.id} for ${sale.customer}`,
        amount: sale.items ? sale.items.reduce((sum, item) => sum + (item.qty * item.rate * (1 + item.gst / 100)), 0) : 0,
        time: new Date(sale.date).toLocaleDateString('en-IN'),
        type: 'sale',
        status: sale.status
      });
    });

    // Recent purchases
    filteredPurchases.slice(0, 3).forEach(purchase => {
      activities.push({
        id: `purchase-${purchase.id}`,
        action: 'Purchase bill added',
        details: `Bill ${purchase.billNumber} from ${purchase.supplier}`,
        amount: purchase.items ? purchase.items.reduce((sum, item) => sum + (item.qty * item.rate * (1 + item.gst / 100)), 0) : 0,
        time: new Date(purchase.date).toLocaleDateString('en-IN'),
        type: 'purchase',
        status: purchase.paymentStatus
      });
    });

    // Recent orders
    filteredOrders.slice(0, 2).forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        action: 'New order received',
        details: `Order ${order.id} from ${order.customerName}`,
        amount: order.items ? order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) : 0,
        time: new Date(order.orderDate).toLocaleDateString('en-IN'),
        type: 'order',
        status: order.status
      });
    });

    // Sort by date and return top 8
    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  };

  // Get low stock items
  const getLowStockItems = () => {
    return inventory
      .filter(item => (item.stock || 0) < 20)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 6);
  };

  // Get top products by value
  const getTopProducts = () => {
    return inventory
      .map(item => ({
        ...item,
        totalValue: (item.price || 0) * (item.stock || 0)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  };

  // Get period trends based on selected time period
  const getPeriodTrends = () => {
    const filteredSales = filterDataByPeriod(sales, 'date');
    const filteredPurchases = filterDataByPeriod(purchases, 'date');
    const filteredOrders = filterDataByPeriod(orders, 'orderDate');

    return { 
      periodSales: filteredSales.length, 
      periodPurchases: filteredPurchases.length, 
      periodOrders: filteredOrders.length 
    };
  };

  // Get period label
  const getPeriodLabel = () => {
    // If custom date is selected, show that date
    if (useCustomDate && selectedDate) {
      const customDate = new Date(selectedDate);
      return customDate.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    // Otherwise show the period label
    const now = new Date();
    switch (timePeriod) {
      case 'daily':
        return now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      case 'weekly':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      case 'monthly':
        return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `Q${quarter} ${now.getFullYear()}`;
      case 'yearly':
        return now.getFullYear().toString();
      default:
        return 'This Month';
    }
  };

  // Handle date selection
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (date) {
      setUseCustomDate(true);
    }
  };

  // Handle period change
  const handlePeriodChange = (e) => {
    setTimePeriod(e.target.value);
    setUseCustomDate(false);
    setSelectedDate('');
  };

  // Clear custom date
  const clearCustomDate = () => {
    setUseCustomDate(false);
    setSelectedDate('');
  };

  const recentActivity = getRecentActivity();
  const lowStockItems = getLowStockItems();
  const topProducts = getTopProducts();
  const periodTrends = getPeriodTrends();

  // Get report data based on selected report
  const getReportData = () => {
    if (!selectedReport) return null;

    const reportData = {
      period: getPeriodLabel(),
      revenue: stats.totalRevenue,
      expenses: stats.totalPurchaseAmount,
      profit: stats.totalRevenue - stats.totalPurchaseAmount,
      profitMargin: stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalPurchaseAmount) / stats.totalRevenue * 100).toFixed(2) : '0.00',
      sales: {
        total: stats.totalSales,
        paid: stats.paidSales,
        pending: stats.pendingSales,
        paidAmount: sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.items?.reduce((itemSum, item) => itemSum + (item.qty * item.rate * (1 + item.gst / 100)), 0) || 0), 0),
        pendingAmount: sales.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.items?.reduce((itemSum, item) => itemSum + (item.qty * item.rate * (1 + item.gst / 100)), 0) || 0), 0)
      },
      purchases: {
        total: stats.totalPurchases,
        paid: stats.paidPurchases,
        pending: stats.pendingPurchases,
        overdue: stats.overduePurchases
      },
      inventory: {
        totalProducts: inventory.length,
        totalValue: inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0),
        lowStockCount: inventory.filter(item => (item.stock || 0) < 20).length,
        outOfStockCount: inventory.filter(item => (item.stock || 0) === 0).length,
        avgStockValue: inventory.length > 0 ? inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0) / inventory.length : 0
      },
      topCustomers: Object.entries(customers).sort(([,a], [,b]) => b.totalAmount - a.totalAmount).slice(0, 5),
      topSuppliers: Object.entries(suppliers).sort(([,a], [,b]) => b.totalAmount - a.totalAmount).slice(0, 5),
      gst: {
        totalSalesGST: sales.reduce((sum, sale) => {
          if (!sale.items) return sum;
          return sum + sale.items.reduce((itemSum, item) => {
            const itemTotal = item.qty * item.rate;
            return itemSum + (itemTotal * (item.gst / 100));
          }, 0);
        }, 0),
        totalPurchaseGST: purchases.reduce((sum, purchase) => {
          if (!purchase.items) return sum;
          return sum + purchase.items.reduce((itemSum, item) => {
            const itemTotal = item.qty * item.rate;
            return itemSum + (itemTotal * (item.gst / 100));
          }, 0);
        }, 0)
      }
    };

    reportData.gst.netGSTLiability = reportData.gst.totalSalesGST - reportData.gst.totalPurchaseGST;

    return reportData;
  };

  const reportData = getReportData();

  // Business Report Generation Functions
  const generateFinancialReport = () => {
    setSelectedReport('financial');
  };

  const generateInventoryReport = () => {
    setSelectedReport('inventory');
  };

  const generatePerformanceReport = () => {
    setSelectedReport('performance');
  };

  const generateTaxReport = () => {
    setSelectedReport('tax');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Dashboard</h1>
          </div>
          <div className="header-controls">
            <div className="filter-controls">
              <div className="time-period-filter">
                <label htmlFor="timePeriod">View Period:</label>
                <select 
                  id="timePeriod" 
                  value={timePeriod} 
                  onChange={handlePeriodChange}
                  className="period-select"
                  disabled={useCustomDate}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div className="date-filter">
                <label htmlFor="customDate">Or Select Date:</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    id="customDate"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="date-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {useCustomDate && (
                    <button 
                      className="clear-date-btn" 
                      onClick={clearCustomDate}
                      title="Clear custom date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="header-date">
              <div className="current-period">
                <span className="period-label">
                  {useCustomDate ? 'Selected Date' : 'Current Period'}
                </span>
                <span className="period-value">{getPeriodLabel()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="kpi-section">
        <div className="section-header">
          <h2 className="section-title">Key Performance Indicators</h2>
          {useCustomDate && (
            <div className="custom-date-indicator">
              <span className="indicator-icon">📅</span>
              <span className="indicator-text">Showing data for selected date</span>
            </div>
          )}
        </div>
        <div className="stats-grid">
          <div className="stat-card revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
              <p>Total Revenue</p>
              <span className="stat-trend positive">+12.5% from last period</span>
            </div>
          </div>

          <div className="stat-card sales">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.totalSales}</h3>
              <p>Total Sales</p>
              <span className="stat-detail">{stats.paidSales} paid, {stats.pendingSales} pending</span>
            </div>
          </div>

          <div className="stat-card inventory">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{stats.totalProducts}</h3>
              <p>Inventory Items</p>
              <span className="stat-detail">₹{stats.totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} value</span>
            </div>
          </div>

          <div className="stat-card orders">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
              <span className="stat-detail">{stats.pendingOrders} pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="overview-section">
        <div className="overview-grid">
          <div className="overview-card purchases">
            <div className="card-header">
              <h3>Purchases</h3>
              <span className="card-value">₹{stats.totalPurchaseAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="card-stats">
              <div className="stat-item">
                <span className="stat-label">Total Bills</span>
                <span className="stat-value">{stats.totalPurchases}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Paid</span>
                <span className="stat-value green">{stats.paidPurchases}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending</span>
                <span className="stat-value orange">{stats.pendingPurchases}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Overdue</span>
                <span className="stat-value red">{stats.overduePurchases}</span>
              </div>
            </div>
          </div>

          <div className="overview-card suppliers">
            <div className="card-header">
              <h3>Suppliers</h3>
              <span className="card-value">{stats.totalSuppliers}</span>
            </div>
            <div className="card-content">
              <div className="supplier-list">
                {Object.entries(suppliers).slice(0, 3).map(([gstin, supplier]) => (
                  <div key={gstin} className="supplier-item">
                    <span className="supplier-name">{supplier.name}</span>
                    <span className="supplier-amount">₹{supplier.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overview-card customers">
            <div className="card-header">
              <h3>Customers</h3>
              <span className="card-value">{stats.totalCustomers}</span>
            </div>
            <div className="card-content">
              <div className="customer-list">
                {Object.entries(customers).slice(0, 3).map(([gstin, customer]) => (
                  <div key={gstin} className="customer-item">
                    <span className="customer-name">{customer.name}</span>
                    <span className="customer-amount">₹{customer.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overview-card alerts">
            <div className="card-header">
              <h3>Alerts</h3>
              <span className="card-value alert">{stats.lowStockItems + stats.outOfStockItems}</span>
            </div>
            <div className="card-stats">
              <div className="stat-item">
                <span className="stat-label">Low Stock</span>
                <span className="stat-value orange">{stats.lowStockItems}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Out of Stock</span>
                <span className="stat-value red">{stats.outOfStockItems}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Overdue Bills</span>
                <span className="stat-value red">{stats.overduePurchases}</span>
              </div>
            </div>
          </div>

          <div className="overview-card business-reports">
            <div className="card-header">
              <h3>Business Reports</h3>
              <span className="card-value">📊</span>
            </div>
            <div className="reports-grid">
              <button 
                className="report-btn financial" 
                onClick={() => generateFinancialReport()}
                title="Generate comprehensive financial report"
              >
                <div className="report-icon">💰</div>
                <span className="report-name">Financial Report</span>
              </button>
              <button 
                className="report-btn inventory" 
                onClick={() => generateInventoryReport()}
                title="Generate detailed inventory analysis"
              >
                <div className="report-icon">📦</div>
                <span className="report-name">Inventory Analysis</span>
              </button>
              <button 
                className="report-btn performance" 
                onClick={() => generatePerformanceReport()}
                title="Generate business performance metrics"
              >
                <div className="report-icon">📈</div>
                <span className="report-name">Performance Metrics</span>
              </button>
              <button 
                className="report-btn tax" 
                onClick={() => generateTaxReport()}
                title="Generate GST and tax summary"
              >
                <div className="report-icon">🧾</div>
                <span className="report-name">Tax Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="dashboard-main">
        <div className="dashboard-left">
          {/* Recent Activity */}
          <div className="dashboard-card activity-card">
            <div className="card-header">
              <h2>Recent Activity</h2>
              <span className="activity-count">{recentActivity.length} recent</span>
            </div>
            <div className="activity-list">
              {recentActivity.length > 0 ? recentActivity.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className={`activity-badge ${activity.type}`}>
                    {activity.type === 'sale' ? '💰' : 
                     activity.type === 'purchase' ? '🛒' : 
                     activity.type === 'order' ? '📋' : '📦'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-action">{activity.action}</p>
                    <p className="activity-details">{activity.details}</p>
                    <div className="activity-meta">
                      <span className="activity-time">{activity.time}</span>
                      <span className={`activity-status ${activity.status}`}>
                        {activity.status}
                      </span>
                      <span className="activity-amount">₹{activity.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="dashboard-card products-card">
            <div className="card-header">
              <h2>Top Products by Value</h2>
            </div>
            <div className="products-list">
              {topProducts.length > 0 ? topProducts.map((product, index) => (
                <div key={product.id} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-info">
                    <p className="product-name">{product.name}</p>
                    <p className="product-details">Stock: {product.stock} | Price: ₹{product.price}</p>
                  </div>
                  <div className="product-value">
                    <span className="value-amount">₹{product.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <p>No products in inventory</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-right">
          {selectedReport ? (
            <div className="dashboard-card report-display-card">
              <div className="card-header">
                <h2>
                  {selectedReport === 'financial' && '💰 Financial Report'}
                  {selectedReport === 'inventory' && '📦 Inventory Analysis'}
                  {selectedReport === 'performance' && '📈 Performance Metrics'}
                  {selectedReport === 'tax' && '🧾 Tax Summary'}
                </h2>
                <button 
                  className="close-report-btn" 
                  onClick={() => setSelectedReport(null)}
                  title="Close report"
                >
                  ✕
                </button>
              </div>
              <div className="report-content">
                {selectedReport === 'financial' && (
                  <div className="financial-report">
                    <div className="report-section">
                      <h3>📊 Financial Overview</h3>
                      <div className="report-metrics">
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.revenue.toLocaleString('en-IN')}</span>
                          <span className="metric-label">Total Revenue</span>
                        </div>
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.expenses.toLocaleString('en-IN')}</span>
                          <span className="metric-label">Total Expenses</span>
                        </div>
                        <div className="report-metric">
                          <span className={`metric-value ${reportData?.profit >= 0 ? 'positive' : 'negative'}`}>
                            ₹{reportData?.profit.toLocaleString('en-IN')}
                          </span>
                          <span className="metric-label">Net Profit</span>
                        </div>
                        <div className="report-metric">
                          <span className={`metric-value ${reportData?.profitMargin >= 0 ? 'positive' : 'negative'}`}>
                            {reportData?.profitMargin}%
                          </span>
                          <span className="metric-label">Profit Margin</span>
                        </div>
                      </div>
                    </div>
                    <div className="report-section">
                      <h3>💰 Sales Breakdown</h3>
                      <div className="breakdown-stats">
                        <div className="breakdown-item">
                          <span className="breakdown-label">Total Sales:</span>
                          <span className="breakdown-value">{reportData?.sales.total}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Paid Sales:</span>
                          <span className="breakdown-value positive">{reportData?.sales.paid}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Pending Sales:</span>
                          <span className="breakdown-value negative">{reportData?.sales.pending}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'inventory' && (
                  <div className="inventory-report">
                    <div className="report-section">
                      <h3>📊 Inventory Overview</h3>
                      <div className="report-metrics">
                        <div className="report-metric">
                          <span className="metric-value">{reportData?.inventory.totalProducts}</span>
                          <span className="metric-label">Total Products</span>
                        </div>
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.inventory.totalValue.toLocaleString('en-IN')}</span>
                          <span className="metric-label">Total Value</span>
                        </div>
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.inventory.avgStockValue.toLocaleString('en-IN')}</span>
                          <span className="metric-label">Avg Stock Value</span>
                        </div>
                      </div>
                    </div>
                    <div className="report-section">
                      <h3>⚠️ Stock Status</h3>
                      <div className="stock-status-grid">
                        <div className="status-item good">
                          <span className="status-value">{reportData?.inventory.totalProducts - reportData?.inventory.lowStockCount - reportData?.inventory.outOfStockCount}</span>
                          <span className="status-label">Well Stocked</span>
                        </div>
                        <div className="status-item warning">
                          <span className="status-value">{reportData?.inventory.lowStockCount}</span>
                          <span className="status-label">Low Stock</span>
                        </div>
                        <div className="status-item danger">
                          <span className="status-value">{reportData?.inventory.outOfStockCount}</span>
                          <span className="status-label">Out of Stock</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'performance' && (
                  <div className="performance-report">
                    <div className="report-section">
                      <h3>🏆 Top Customers</h3>
                      <div className="ranking-list">
                        {reportData?.topCustomers.slice(0, 3).map(([gstin, customer], index) => (
                          <div key={gstin} className="ranking-item">
                            <span className="rank-number">{index + 1}</span>
                            <div className="rank-info">
                              <span className="rank-name">{customer.name}</span>
                              <span className="rank-amount">₹{customer.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="report-section">
                      <h3>🏭 Top Suppliers</h3>
                      <div className="ranking-list">
                        {reportData?.topSuppliers.slice(0, 3).map(([gstin, supplier], index) => (
                          <div key={gstin} className="ranking-item">
                            <span className="rank-number">{index + 1}</span>
                            <div className="rank-info">
                              <span className="rank-name">{supplier.name}</span>
                              <span className="rank-amount">₹{supplier.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="report-section">
                      <h3>⚡ Business Efficiency</h3>
                      <div className="efficiency-metrics">
                        <div className="efficiency-item">
                          <span className="efficiency-value">{((stats.paidSales / stats.totalSales) * 100).toFixed(1)}%</span>
                          <span className="efficiency-label">Payment Rate</span>
                        </div>
                        <div className="efficiency-item">
                          <span className="efficiency-value">{((stats.totalRevenue - stats.totalPurchaseAmount) / stats.totalRevenue * 100).toFixed(1)}%</span>
                          <span className="efficiency-label">Profit Margin</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport === 'tax' && (
                  <div className="tax-report">
                    <div className="report-section">
                      <h3>📊 GST Summary</h3>
                      <div className="report-metrics">
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.gst.totalSalesGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="metric-label">Output GST</span>
                        </div>
                        <div className="report-metric">
                          <span className="metric-value">₹{reportData?.gst.totalPurchaseGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                          <span className="metric-label">Input GST</span>
                        </div>
                        <div className="report-metric">
                          <span className={`metric-value ${reportData?.gst.netGSTLiability >= 0 ? 'negative' : 'positive'}`}>
                            ₹{Math.abs(reportData?.gst.netGSTLiability).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                          <span className="metric-label">{reportData?.gst.netGSTLiability >= 0 ? 'GST Payable' : 'GST Refund'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="report-section">
                      <h3>🏛️ Tax Breakdown</h3>
                      <div className="tax-breakdown">
                        <div className="tax-item">
                          <span className="tax-label">Sales (Excl. GST):</span>
                          <span className="tax-value">₹{(reportData?.revenue - reportData?.gst.totalSalesGST).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="tax-item">
                          <span className="tax-label">Purchases (Excl. GST):</span>
                          <span className="tax-value">₹{(reportData?.expenses - reportData?.gst.totalPurchaseGST).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Low Stock Alert */}
              <div className="dashboard-card stock-card">
                <div className="card-header">
                  <h2>Low Stock Alert</h2>
                  <span className="alert-count">{lowStockItems.length} items</span>
                </div>
                <div className="low-stock-list">
                  {lowStockItems.length > 0 ? lowStockItems.map(item => (
                    <div key={item.id} className="low-stock-item">
                      <div className="item-info">
                        <p className="item-name">{item.name}</p>
                        <p className="item-details">HSN: {item.hsn}</p>
                      </div>
                      <div className="stock-info">
                        <div className="stock-visual">
                          <div className="stock-bar">
                            <div 
                              className={`stock-fill ${(item.stock || 0) === 0 ? 'empty' : (item.stock || 0) < 10 ? 'critical' : 'low'}`}
                              style={{ width: `${Math.max(((item.stock || 0) / 50) * 100, 5)}%` }}
                            ></div>
                          </div>
                          <span className="stock-text">{item.stock || 0}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state">
                      <p>All items are well stocked!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Period Summary */}
              <div className="dashboard-card summary-card">
                <div className="card-header">
                  <h2>{timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Summary</h2>
                  <span className="period-name">{getPeriodLabel()}</span>
                </div>
                <div className="summary-stats">
                  <div className="summary-item">
                    <div className="summary-icon sales">📊</div>
                    <div className="summary-content">
                      <span className="summary-value">{periodTrends.periodSales}</span>
                      <span className="summary-label">Sales</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon purchases">🛒</div>
                    <div className="summary-content">
                      <span className="summary-value">{periodTrends.periodPurchases}</span>
                      <span className="summary-label">Purchases</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-icon orders">📋</div>
                    <div className="summary-content">
                      <span className="summary-value">{periodTrends.periodOrders}</span>
                      <span className="summary-label">Orders</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
