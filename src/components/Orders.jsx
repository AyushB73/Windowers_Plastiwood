import { useState, useEffect } from 'react';
import { useDataSync, useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import './Orders.css';

const Orders = ({ userRole }) => {
  // Use synchronized data
  const { data: customers } = useObjectDataSync(DATA_KEYS.CUSTOMERS, {});
  const { data: inventory } = useDataSync(DATA_KEYS.INVENTORY, []);
  const { 
    data: invoices, 
    updateItem: updateInvoice 
  } = useDataSync(DATA_KEYS.INVOICES, []);
  const { 
    data: orders, 
    updateData: setOrders, 
    addItem: addOrder, 
    updateItem: updateOrder, 
    removeItem: removeOrder 
  } = useDataSync(DATA_KEYS.ORDERS, [
    {
      id: 'ORD-2026-001',
      orderDate: '2026-01-06',
      customerName: 'ABC Construction Pvt Ltd',
      customerPhone: '+91 9876543210',
      customerEmail: 'contact@abcconstruction.com',
      shippingAddress: '123 Business Park, Mumbai, Maharashtra - 400001',
      deliveryDate: '2026-01-13',
      status: 'pending',
      items: [
        { productName: 'Plastiwood Deck Board 2x6', quantity: 50, price: 3499 }
      ],
      invoiceId: 'INV-2026-001',
      createdFrom: 'sales'
    },
    {
      id: 'ORD-2026-002',
      orderDate: '2026-01-05',
      customerName: 'Green Landscapes Inc',
      customerPhone: '+91 9876543211',
      customerEmail: 'info@greenlandscapes.com',
      shippingAddress: '456 Garden Street, Bangalore, Karnataka - 560001',
      deliveryDate: '2026-01-12',
      status: 'pending',
      items: [
        { productName: 'Garden Edging 10ft', quantity: 100, price: 1899 },
        { productName: 'Composite Planter Box', quantity: 25, price: 6099 }
      ],
      invoiceId: 'INV-2026-002',
      createdFrom: 'sales'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    shippingAddress: '',
    status: 'pending',
    items: [{ productName: '', quantity: 1, price: 0 }]
  });

  // Autofill customer details when customer name is selected
  const handleCustomerNameChange = (customerName) => {
    setFormData({ ...formData, customerName });
    
    // Find customer by name in existing customers database
    const customerEntry = Object.entries(customers).find(([gstin, customer]) => 
      customer.name.toLowerCase() === customerName.toLowerCase()
    );
    
    if (customerEntry) {
      const [gstin, customerData] = customerEntry;
      setFormData({
        ...formData,
        customerName,
        customerPhone: customerData.phone || '',
        customerEmail: customerData.email || '',
        shippingAddress: customerData.address || ''
      });
    }
  };

  // Autofill item details when product is selected
  const handleProductChange = (index, productName) => {
    const items = [...formData.items];
    items[index].productName = productName;
    
    // Find product in inventory
    const inventoryItem = inventory.find(item => 
      item.name.toLowerCase() === productName.toLowerCase()
    );
    
    if (inventoryItem) {
      items[index] = {
        ...items[index],
        productName: inventoryItem.name,
        price: inventoryItem.price || 0
      };
    }
    
    setFormData({ ...formData, items });
  };

  // Get unique customer names for datalist
  const getCustomerNames = () => {
    return Object.values(customers).map(customer => customer.name);
  };

  // Get inventory product names for datalist
  const getProductNames = () => {
    return inventory.map(item => item.name);
  };

  const calculateOrder = (items) => {
    let subtotal = 0;
    let totalGST = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;
      const gstAmount = (itemTotal * 18) / 100; // Default 18% GST
      totalGST += gstAmount;
    });

    return {
      subtotal: subtotal.toFixed(2),
      totalGST: totalGST.toFixed(2),
      grandTotal: (subtotal + totalGST).toFixed(2)
    };
  };

  const filteredOrders = (orders || []).filter(order => {
    if (!order) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.id || '').toLowerCase().includes(searchLower) ||
      (order.customerName || '').toLowerCase().includes(searchLower) ||
      (order.customerPhone || '').toLowerCase().includes(searchLower) ||
      (order.customerEmail || '').toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      shippingAddress: order.shippingAddress,
      status: order.status,
      items: [...order.items]
    });
    setShowEditModal(true);
  };

  const handleDeleteOrder = (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      removeOrder(id);
      alert('Order deleted successfully!');
    }
  };

  const handleGenerateOrderPDF = (order) => {
    const companyInfo = JSON.parse(localStorage.getItem('companyInfo') || '{}');
    
    if (!companyInfo.name) {
      alert('Please configure company settings first in Sales & GST tab!');
      return;
    }

    const calc = calculateOrder(order.items);
    
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Invoice ${order.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #333;
      padding: 20px;
    }
    
    .invoice-header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .company-logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 12px;
      line-height: 1.6;
      color: #666;
    }
    
    .invoice-title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      background: #27ae60;
      color: white;
      padding: 10px;
      margin: 20px 0;
    }
    
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .meta-section {
      flex: 1;
    }
    
    .meta-section h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    
    .meta-section p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 3px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .items-table th {
      background: #2c3e50;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      border: 1px solid #333;
    }
    
    .items-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    
    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .totals-section {
      margin-top: 20px;
      float: right;
      width: 350px;
    }
    
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .totals-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-size: 12px;
    }
    
    .totals-table .label {
      font-weight: bold;
      background: #f5f5f5;
    }
    
    .totals-table .grand-total {
      background: #27ae60;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    
    .bank-details {
      clear: both;
      margin-top: 40px;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    
    .bank-details h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    
    .bank-details p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 3px;
    }
    
    .terms {
      margin-top: 20px;
      font-size: 11px;
      color: #666;
      line-height: 1.6;
    }
    
    .signature-section {
      margin-top: 40px;
      text-align: right;
    }
    
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #333;
      display: inline-block;
      padding-top: 5px;
      min-width: 200px;
      text-align: center;
      font-size: 12px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-processing { background: #e3f2fd; color: #1565c0; }
    .status-shipped { background: #f3e5f5; color: #6a1b9a; }
    .status-delivered { background: #e8f5e9; color: #2e7d32; }
    
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div class="company-logo">${companyInfo.logo || '🌲'}</div>
      <div class="company-name">${companyInfo.name || 'Windowers Plastiwood Pvt Ltd'}</div>
      <div class="company-details">
        ${companyInfo.address || ''}, ${companyInfo.city || ''}, ${companyInfo.state || ''} - ${companyInfo.pincode || ''}<br>
        ${companyInfo.gstin ? `GSTIN: ${companyInfo.gstin} | ` : ''}${companyInfo.pan ? `PAN: ${companyInfo.pan}` : ''}<br>
        Email: ${companyInfo.email || ''} | Phone: ${companyInfo.phone || ''}
        ${companyInfo.website ? `<br>Website: ${companyInfo.website}` : ''}
      </div>
    </div>
    
    <!-- Invoice Title -->
    <div class="invoice-title">ORDER INVOICE</div>
    
    <!-- Invoice Meta -->
    <div class="invoice-meta">
      <div class="meta-section">
        <h3>Customer Details:</h3>
        <p><strong>${order.customerName}</strong></p>
        <p>Phone: ${order.customerPhone}</p>
        <p>Email: ${order.customerEmail || 'N/A'}</p>
        <p>Shipping Address: ${order.shippingAddress}</p>
      </div>
      
      <div class="meta-section">
        <h3>Order Details:</h3>
        <p><strong>Order No:</strong> ${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
        <p><strong>Delivery Date:</strong> ${new Date(order.deliveryDate).toLocaleDateString('en-IN')}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></p>
        ${order.invoiceId ? `<p><strong>Invoice ID:</strong> ${order.invoiceId}</p>` : ''}
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center">S.No</th>
          <th>Product Description</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Rate (₹)</th>
          <th class="text-center">GST %</th>
          <th class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.productName}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${item.price.toFixed(2)}</td>
            <td class="text-center">18%</td>
            <td class="text-right">${(item.quantity * item.price * 1.18).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="text-right">₹${calc.subtotal}</td>
        </tr>
        <tr>
          <td class="label">Total GST:</td>
          <td class="text-right">₹${calc.totalGST}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right">₹${calc.grandTotal}</td>
        </tr>
      </table>
    </div>
    
    <!-- Bank Details -->
    ${companyInfo.bankName ? `
    <div class="bank-details">
      <h3>Bank Details:</h3>
      <p><strong>Bank Name:</strong> ${companyInfo.bankName}</p>
      <p><strong>Account Number:</strong> ${companyInfo.accountNumber}</p>
      <p><strong>IFSC Code:</strong> ${companyInfo.ifscCode}</p>
      <p><strong>Branch:</strong> ${companyInfo.branch}</p>
    </div>
    ` : ''}
    
    <!-- Terms -->
    <div class="terms">
      <strong>Terms & Conditions:</strong><br>
      1. Delivery will be made on or before the specified delivery date.<br>
      2. Payment terms as agreed upon order confirmation.<br>
      3. All disputes are subject to ${companyInfo.city || 'Mumbai'} jurisdiction only.<br>
      4. Goods once sold will not be taken back or exchanged.
    </div>
    
    <!-- Signature -->
    <div class="signature-section">
      <div class="signature-line">
        Authorized Signatory<br>
        <strong>${companyInfo.name || 'Windowers Plastiwood Pvt Ltd'}</strong>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      This is a computer-generated invoice and does not require a physical signature.<br>
      For any queries, please contact us at ${companyInfo.email || ''} or ${companyInfo.phone || ''}
    </div>
  </div>
  
  <div class="no-print" style="text-align: center; margin-top: 20px;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px;">Print Invoice</button>
    <button onclick="window.close()" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Close</button>
  </div>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productName: '', quantity: 1, price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  };

  const handleItemChange = (index, field, value) => {
    const items = [...formData.items];
    if (field === 'productName') {
      handleProductChange(index, value);
    } else {
      items[index][field] = value;
      setFormData({ ...formData, items });
    }
  };

  const handleFormChange = (field, value) => {
    if (field === 'customerName') {
      handleCustomerNameChange(value);
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const count = (orders || []).length + 1;
    return `ORD-${year}-${String(count).padStart(3, '0')}`;
  };

  const handleSubmit = () => {
    if (!formData.customerName || !formData.customerPhone || !formData.shippingAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.items.some(item => !item.productName || item.quantity <= 0 || item.price <= 0)) {
      alert('Please fill in all item details correctly');
      return;
    }

    const newOrder = {
      id: generateOrderNumber(),
      orderDate: formData.orderDate,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      shippingAddress: formData.shippingAddress,
      deliveryDate: formData.deliveryDate,
      status: formData.status,
      items: formData.items.map(item => ({
        productName: item.productName,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price)
      })),
      createdFrom: 'manual' // Track that this order was created manually
    };

    addOrder(newOrder);
    setShowAddModal(false);
    resetForm();
    alert('Order created successfully!');
  };

  const handleUpdateOrder = () => {
    if (!formData.customerName || !formData.customerPhone || !formData.shippingAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.items.some(item => !item.productName || item.quantity <= 0 || item.price <= 0)) {
      alert('Please fill in all item details correctly');
      return;
    }

    const updatedOrder = {
      ...editingOrder,
      orderDate: formData.orderDate,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      shippingAddress: formData.shippingAddress,
      deliveryDate: formData.deliveryDate,
      status: formData.status,
      items: formData.items.map(item => ({
        productName: item.productName,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price)
      }))
    };

    updateOrder(editingOrder.id, updatedOrder);
    
    // Update corresponding invoice status if linked and status changed
    if (editingOrder.invoiceId && formData.status !== editingOrder.status) {
      const linkedInvoice = invoices.find(invoice => invoice.id === editingOrder.invoiceId);
      if (linkedInvoice) {
        let invoiceStatus = linkedInvoice.status;
        
        // Update invoice status based on order status
        if (formData.status === 'delivered' && linkedInvoice.status === 'pending') {
          // When order is delivered, we can assume payment should be received
          invoiceStatus = 'paid';
        }
        
        if (invoiceStatus !== linkedInvoice.status) {
          updateInvoice(editingOrder.invoiceId, { status: invoiceStatus });
        }
      }
    }
    
    setShowEditModal(false);
    setEditingOrder(null);
    resetForm();
    alert('Order updated successfully!');
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      shippingAddress: '',
      status: 'pending',
      items: [{ productName: '', quantity: 1, price: 0 }]
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      default: return '📦';
    }
  };

  return (
    <div className="orders">
      <div className="orders-header">
        <div>
          <h1>Orders Management</h1>
          <p className="subtitle">Track and manage customer orders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Create New Order</button>
      </div>

      <div className="orders-stats">
        <div className="stat-box">
          <span className="stat-icon">⏳</span>
          <div>
            <p className="stat-number">{orders.filter(o => o.status === 'pending').length}</p>
            <p className="stat-label">Pending</p>
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-icon">⚙️</span>
          <div>
            <p className="stat-number">{orders.filter(o => o.status === 'processing').length}</p>
            <p className="stat-label">Processing</p>
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-icon">🚚</span>
          <div>
            <p className="stat-number">{orders.filter(o => o.status === 'shipped').length}</p>
            <p className="stat-label">Shipped</p>
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-icon">✅</span>
          <div>
            <p className="stat-number">{orders.filter(o => o.status === 'delivered').length}</p>
            <p className="stat-label">Delivered</p>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by order ID, customer name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Items</th>
              <th>Total Amount (₹)</th>
              <th>Delivery Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => {
                if (!order || !order.items) return null;
                const calc = calculateOrder(order.items);
                return (
                  <tr key={order.id}>
                    <td className="order-id">{order.id}</td>
                    <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                    <td className="customer-name">{order.customerName}</td>
                    <td className="phone-cell">{order.customerPhone}</td>
                    <td className="text-center">{order.items.length}</td>
                    <td className="amount total">₹{parseFloat(calc.grandTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td>{new Date(order.deliveryDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)} {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon" 
                          title="View Details"
                          onClick={() => handleViewDetails(order)}
                        >
                          👁️
                        </button>
                        {userRole === 'owner' && (
                          <>
                            <button 
                              className="btn-icon" 
                              title="Edit Order"
                              onClick={() => handleEditOrder(order)}
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-icon" 
                              title="Delete Order"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="no-results">
                  No orders found matching your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > 0 && (
        <div className="table-footer">
          <p>Showing {filteredOrders.length} of {(orders || []).length} orders</p>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && viewingOrder && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>Order Details - {viewingOrder.id}</h2>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="invoice-summary-section">
                <h3>Customer Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Customer Name:</span>
                    <span className="summary-value">{viewingOrder.customerName}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Phone:</span>
                    <span className="summary-value">{viewingOrder.customerPhone}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Email:</span>
                    <span className="summary-value">{viewingOrder.customerEmail}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Shipping Address:</span>
                    <span className="summary-value">{viewingOrder.shippingAddress}</span>
                  </div>
                </div>
              </div>

              <div className="invoice-summary-section">
                <h3>Order Information</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Order Date:</span>
                    <span className="summary-value">{new Date(viewingOrder.orderDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Delivery Date:</span>
                    <span className="summary-value">{new Date(viewingOrder.deliveryDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Status:</span>
                    <span className={`status-badge ${getStatusColor(viewingOrder.status)}`}>
                      {getStatusIcon(viewingOrder.status)} {viewingOrder.status.charAt(0).toUpperCase() + viewingOrder.status.slice(1)}
                    </span>
                  </div>
                  {viewingOrder.invoiceId && (
                    <div className="summary-item">
                      <span className="summary-label">Invoice ID:</span>
                      <span className="summary-value">{viewingOrder.invoiceId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="items-detail-section">
                <h3>Order Items</h3>
                <table className="items-detail-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Rate (₹)</th>
                      <th>GST %</th>
                      <th>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.price.toFixed(2)}</td>
                        <td>18%</td>
                        <td>₹{(item.quantity * item.price * 1.18).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-summary-section" style={{ background: '#e8f5e9', borderLeft: '4px solid #27ae60' }}>
                <h3>Order Summary</h3>
                {(() => {
                  const calc = calculateOrder(viewingOrder.items);
                  return (
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Subtotal:</span>
                        <span className="summary-value">₹{calc.subtotal}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Total GST:</span>
                        <span className="summary-value">₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="summary-label" style={{ fontSize: '1.25rem' }}>Grand Total:</span>
                        <span className="summary-value total-amount" style={{ fontSize: '1.5rem', color: '#27ae60' }}>₹{calc.grandTotal}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button className="btn-primary" onClick={() => handleGenerateOrderPDF(viewingOrder)}>
                📄 Download Invoice PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Order Modal */}
      {(showAddModal || showEditModal) && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>{showAddModal ? 'Create New Order' : `Edit Order - ${editingOrder.id}`}</h2>
              <button className="btn-close" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingOrder(null);
                resetForm();
              }}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="form-section">
                <h3>Customer Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={formData.customerName}
                      onChange={(e) => handleFormChange('customerName', e.target.value)}
                      list="customer-names"
                    />
                    <datalist id="customer-names">
                      {getCustomerNames().map((name, idx) => (
                        <option key={idx} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.customerPhone}
                      onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="customer@email.com"
                      value={formData.customerEmail}
                      onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Shipping Address *</label>
                    <input
                      type="text"
                      placeholder="Enter shipping address"
                      value={formData.shippingAddress}
                      onChange={(e) => handleFormChange('shippingAddress', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Order Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Order Date *</label>
                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => handleFormChange('orderDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Date *</label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleFormChange('deliveryDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Order Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Order Items</h3>
                  <button className="btn-add-item" onClick={handleAddItem}>+ Add Item</button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="item-form">
                    <div className="item-form-grid">
                      <div className="form-group">
                        <label>Product Name</label>
                        <input
                          type="text"
                          placeholder="Product name"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          list="product-names"
                        />
                        <datalist id="product-names">
                          {getProductNames().map((name, idx) => (
                            <option key={idx} value={name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>GST %</label>
                        <input
                          type="text"
                          value="18%"
                          disabled
                        />
                      </div>
                      <div className="form-group">
                        <label>Amount</label>
                        <input
                          type="text"
                          value={`₹${(item.quantity * item.price * 1.18).toFixed(2)}`}
                          disabled
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button className="btn-remove" onClick={() => handleRemoveItem(index)}>
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="invoice-summary">
                {(() => {
                  const calc = calculateOrder(formData.items);
                  return (
                    <>
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>₹{calc.subtotal}</span>
                      </div>
                      <div className="summary-row">
                        <span>Total GST:</span>
                        <span>₹{calc.totalGST}</span>
                      </div>
                      <div className="summary-row total">
                        <span>Grand Total:</span>
                        <span>₹{calc.grandTotal}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingOrder(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={showAddModal ? handleSubmit : handleUpdateOrder}>
                {showAddModal ? 'Create Order' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
