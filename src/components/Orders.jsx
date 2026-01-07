import { useState, useEffect } from 'react';
import { ordersAPI, inventoryAPI } from '../services/api';
import './Orders.css';

const Orders = ({ userRole }) => {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isOwner = userRole === 'owner';

  const [orderData, setOrderData] = useState({
    customer: {
      name: '',
      phone: '',
      email: '',
      address: ''
    },
    items: [],
    notes: '',
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [ordersResponse, inventoryResponse] = await Promise.all([
        ordersAPI.getAll().catch(() => ({ orders: [] })),
        inventoryAPI.getAll().catch(() => ({ items: [] }))
      ]);

      setOrders(ordersResponse.orders || []);
      setInventory(inventoryResponse.items || []);

      // Set default data if API fails
      if (!ordersResponse.orders || ordersResponse.orders.length === 0) {
        setOrders([
          {
            id: 1,
            orderNumber: 'ORD-2026-001',
            customerName: 'Home Decor Solutions',
            customerPhone: '+91 9876543230',
            customerEmail: 'orders@homedecorsolutions.com',
            customerAddress: '456 Residential Complex, Pune, Maharashtra - 411001',
            orderDate: '2026-01-06',
            deliveryDate: '2026-01-13',
            items: [
              { id: 5, productName: 'Plastiwood Railing System', hsn: '39259099', quantity: 10, price: 12299, gst: 18 },
              { id: 6, productName: 'Composite Planter Box', hsn: '39269099', quantity: 5, price: 6099, gst: 18 }
            ],
            subtotal: 153485,
            gstAmount: 27627.3,
            totalAmount: 181112.3,
            status: 'processing',
            notes: 'Custom railing installation project'
          },
          {
            id: 2,
            orderNumber: 'ORD-2026-002',
            customerName: 'Garden Paradise Ltd',
            customerPhone: '+91 9876543231',
            customerEmail: 'info@gardenparadise.com',
            customerAddress: '789 Green Valley, Bangalore, Karnataka - 560001',
            orderDate: '2026-01-05',
            deliveryDate: '2026-01-12',
            items: [
              { id: 4, productName: 'Garden Edging 10ft', hsn: '39259099', quantity: 20, price: 1899, gst: 18 }
            ],
            subtotal: 37980,
            gstAmount: 6836.4,
            totalAmount: 44816.4,
            status: 'pending',
            notes: 'Landscaping project - Phase 1'
          }
        ]);
      }

      if (!inventoryResponse.items || inventoryResponse.items.length === 0) {
        setInventory([
          { id: 1, name: 'Plastiwood Deck Board 2x6', hsn: '39259099', price: 3499, gst: 18, stock: 245 },
          { id: 2, name: 'Composite Fence Panel 6ft', hsn: '39259099', price: 6899, gst: 18, stock: 128 },
          { id: 3, name: 'Outdoor Furniture Set', hsn: '94036090', price: 45999, gst: 18, stock: 34 },
          { id: 4, name: 'Garden Edging 10ft', hsn: '39259099', price: 1899, gst: 18, stock: 456 },
          { id: 5, name: 'Plastiwood Railing System', hsn: '39259099', price: 12299, gst: 18, stock: 67 },
          { id: 6, name: 'Composite Planter Box', hsn: '39269099', price: 6099, gst: 18, stock: 89 }
        ]);
      }

    } catch (error) {
      console.error('Error loading orders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateOrder = async () => {
    if (!orderData.customer.name || orderData.items.length === 0) {
      alert('Please fill in customer details and add at least one item');
      return;
    }

    try {
      const newOrder = {
        orderNumber: `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
        customerName: orderData.customer.name,
        customerPhone: orderData.customer.phone,
        customerEmail: orderData.customer.email,
        customerAddress: orderData.customer.address,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: orderData.deliveryDate,
        items: orderData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'pending',
        notes: orderData.notes
      };

      const response = await ordersAPI.create(newOrder);
      setOrders([...orders, response.order || { ...newOrder, id: Date.now() }]);

      resetOrderForm();
      setShowCreateModal(false);
      alert('Order created successfully!');
    } catch (error) {
      console.error('Error creating order:', error);
      // Fallback for offline mode
      const newOrder = {
        id: Date.now(),
        orderNumber: `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
        customerName: orderData.customer.name,
        customerPhone: orderData.customer.phone,
        customerEmail: orderData.customer.email,
        customerAddress: orderData.customer.address,
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: orderData.deliveryDate,
        items: orderData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'pending',
        notes: orderData.notes
      };
      setOrders([...orders, newOrder]);
      resetOrderForm();
      setShowCreateModal(false);
      alert('Order created successfully!');
    }
  };

  const handleUpdateOrder = async () => {
    try {
      const updatedOrder = {
        ...editingOrder,
        customerName: orderData.customer.name,
        customerPhone: orderData.customer.phone,
        customerEmail: orderData.customer.email,
        customerAddress: orderData.customer.address,
        items: orderData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: orderData.notes,
        deliveryDate: orderData.deliveryDate
      };

      const response = await ordersAPI.update(editingOrder.id, updatedOrder);
      setOrders(orders.map(ord => 
        ord.id === editingOrder.id ? (response.order || updatedOrder) : ord
      ));

      setEditingOrder(null);
      setShowEditModal(false);
      resetOrderForm();
      alert('Order updated successfully!');
    } catch (error) {
      console.error('Error updating order:', error);
      // Fallback for offline mode
      const updatedOrder = {
        ...editingOrder,
        customerName: orderData.customer.name,
        customerPhone: orderData.customer.phone,
        customerEmail: orderData.customer.email,
        customerAddress: orderData.customer.address,
        items: orderData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: orderData.notes
      };
      setOrders(orders.map(ord => ord.id === editingOrder.id ? updatedOrder : ord));
      setEditingOrder(null);
      setShowEditModal(false);
      resetOrderForm();
      alert('Order updated successfully!');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!isOwner) {
      alert('Only owners can delete orders');
      return;
    }

    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await ordersAPI.delete(id);
        setOrders(orders.filter(ord => ord.id !== id));
        alert('Order deleted successfully!');
      } catch (error) {
        console.error('Error deleting order:', error);
        // Fallback for offline mode
        setOrders(orders.filter(ord => ord.id !== id));
        alert('Order deleted successfully!');
      }
    }
  };

  const calculateSubtotal = () => {
    return orderData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateGST = () => {
    return orderData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      return sum + (itemTotal * item.gst / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const addItemToOrder = (product) => {
    const existingItem = orderData.items.find(item => item.id === product.id);
    if (existingItem) {
      setOrderData({
        ...orderData,
        items: orderData.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setOrderData({
        ...orderData,
        items: [...orderData.items, {
          id: product.id,
          productName: product.name,
          hsn: product.hsn,
          quantity: 1,
          price: product.price,
          gst: product.gst
        }]
      });
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setOrderData({
        ...orderData,
        items: orderData.items.filter(item => item.id !== itemId)
      });
    } else {
      setOrderData({
        ...orderData,
        items: orderData.items.map(item =>
          item.id === itemId ? { ...item, quantity: parseInt(quantity) } : item
        )
      });
    }
  };

  const resetOrderForm = () => {
    setOrderData({
      customer: {
        name: '',
        phone: '',
        email: '',
        address: ''
      },
      items: [],
      notes: '',
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setOrderData({
      customer: {
        name: order.customerName,
        phone: order.customerPhone || '',
        email: order.customerEmail || '',
        address: order.customerAddress || ''
      },
      items: order.items,
      notes: order.notes || '',
      deliveryDate: order.deliveryDate
    });
    setShowEditModal(true);
  };

  const updateOrderStatus = async (id, status) => {
    try {
      const response = await ordersAPI.update(id, { status });
      setOrders(orders.map(ord => 
        ord.id === id ? { ...ord, status } : ord
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      // Fallback for offline mode
      setOrders(orders.map(ord => 
        ord.id === id ? { ...ord, status } : ord
      ));
    }
  };

  if (loading) {
    return (
      <div className="orders">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading orders data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders">
      <div className="orders-header">
        <div>
          <h1>Order Management</h1>
          <p className="subtitle">Track and manage customer orders</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Order
        </button>
      </div>

      {/* Create/Edit Order Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="order-modal">
          <div className="order-modal-content">
            <div className="order-modal-header">
              <h2>{showCreateModal ? 'Create New Order' : 'Edit Order'}</h2>
              <button className="btn-close" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingOrder(null);
                resetOrderForm();
              }}>✕</button>
            </div>

            <div className="order-modal-body">
              {/* Customer Information */}
              <div className="form-section">
                <h3>Customer Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={orderData.customer.name}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customer: { ...orderData.customer, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={orderData.customer.phone}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customer: { ...orderData.customer, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={orderData.customer.email}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customer: { ...orderData.customer, email: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Date</label>
                    <input
                      type="date"
                      value={orderData.deliveryDate}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        deliveryDate: e.target.value
                      })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Delivery Address</label>
                    <textarea
                      placeholder="Enter complete delivery address"
                      value={orderData.customer.address}
                      onChange={(e) => setOrderData({
                        ...orderData,
                        customer: { ...orderData.customer, address: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="form-section">
                <h3>Add Products</h3>
                <div className="product-grid">
                  {inventory.map(product => (
                    <div key={product.id} className="product-card">
                      <div className="product-info">
                        <h4>{product.name}</h4>
                        <p>HSN: {product.hsn}</p>
                        <p>Price: ₹{product.price.toLocaleString('en-IN')}</p>
                        <p>GST: {product.gst}%</p>
                        <p>Stock: {product.stock}</p>
                      </div>
                      <button 
                        className="btn-secondary"
                        onClick={() => addItemToOrder(product)}
                        disabled={product.stock <= 0}
                      >
                        Add to Order
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              {orderData.items.length > 0 && (
                <div className="form-section">
                  <h3>Order Items</h3>
                  <div className="order-items">
                    {orderData.items.map(item => (
                      <div key={item.id} className="order-item">
                        <div className="item-details">
                          <h4>{item.productName}</h4>
                          <p>HSN: {item.hsn} | Price: ₹{item.price.toLocaleString('en-IN')} | GST: {item.gst}%</p>
                        </div>
                        <div className="item-controls">
                          <label>Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                          />
                          <button 
                            className="btn-danger"
                            onClick={() => updateItemQuantity(item.id, 0)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="item-total">
                          ₹{(item.quantity * item.price * (1 + item.gst / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span>GST:</span>
                      <span>₹{calculateGST().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total:</span>
                      <span>₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="form-section">
                <h3>Notes</h3>
                <textarea
                  placeholder="Add any additional notes or special instructions..."
                  value={orderData.notes}
                  onChange={(e) => setOrderData({
                    ...orderData,
                    notes: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="order-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingOrder(null);
                resetOrderForm();
              }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={showCreateModal ? handleCreateOrder : handleUpdateOrder}
                disabled={!orderData.customer.name || orderData.items.length === 0}
              >
                {showCreateModal ? 'Create Order' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="orders-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by customer name or order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Order Date</th>
              <th>Delivery Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td className="order-number">{order.orderNumber}</td>
                <td className="customer-name">{order.customerName}</td>
                <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                <td>{new Date(order.deliveryDate).toLocaleDateString('en-IN')}</td>
                <td className="amount">₹{order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className={`status-badge ${order.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => openEditModal(order)}
                    >
                      ✏️
                    </button>
                    {isOwner && (
                      <button 
                        className="btn-icon" 
                        title="Delete"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="empty-state">
          <p>No orders found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Orders;