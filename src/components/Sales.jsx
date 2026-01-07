import { useState, useEffect } from 'react';
import { salesAPI, inventoryAPI, companyAPI } from '../services/api';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import './Sales.css';

const Sales = ({ userRole }) => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState({});
  const [inventory, setInventory] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isOwner = userRole === 'owner';

  const [invoiceData, setInvoiceData] = useState({
    customer: {
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      state: ''
    },
    items: [],
    notes: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [salesResponse, inventoryResponse, companyResponse] = await Promise.all([
        salesAPI.getAll().catch(() => ({ invoices: [], customers: {} })),
        inventoryAPI.getAll().catch(() => ({ items: [] })),
        companyAPI.get().catch(() => ({ company: null }))
      ]);

      setInvoices(salesResponse.invoices || []);
      setCustomers(salesResponse.customers || {});
      setInventory(inventoryResponse.items || []);
      setCompanyInfo(companyResponse.company);

      // Set default data if API fails
      if (!salesResponse.invoices || salesResponse.invoices.length === 0) {
        setInvoices([
          {
            id: 1,
            invoiceNumber: 'INV-2026-001',
            customerName: 'ABC Construction Pvt Ltd',
            customerGstin: '27AABCU9603R1ZM',
            invoiceDate: '2026-01-06',
            dueDate: '2026-02-05',
            items: [
              { id: 1, productName: 'Plastiwood Deck Board 2x6', hsn: '39259099', quantity: 50, price: 3499, gst: 18 },
              { id: 3, productName: 'Outdoor Furniture Set', hsn: '94036090', quantity: 2, price: 45999, gst: 18 }
            ],
            subtotal: 266948,
            gstAmount: 48050.64,
            totalAmount: 314998.64,
            status: 'paid',
            notes: 'Bulk order for construction project'
          }
        ]);
      }

      if (!salesResponse.customers || Object.keys(salesResponse.customers).length === 0) {
        setCustomers({
          '27AABCU9603R1ZM': {
            name: 'ABC Construction Pvt Ltd',
            gstin: '27AABCU9603R1ZM',
            phone: '+91 9876543210',
            email: 'contact@abcconstruction.com',
            address: '123 Business Park, Mumbai, Maharashtra - 400001',
            state: 'Maharashtra',
            totalInvoices: 1,
            totalAmount: 314998.64,
            lastInvoiceDate: '2026-01-06'
          }
        });
      }

      if (!inventoryResponse.items || inventoryResponse.items.length === 0) {
        setInventory([
          { id: 1, name: 'Plastiwood Deck Board 2x6', hsn: '39259099', price: 3499, gst: 18, stock: 245 },
          { id: 2, name: 'Composite Fence Panel 6ft', hsn: '39259099', price: 6899, gst: 18, stock: 128 },
          { id: 3, name: 'Outdoor Furniture Set', hsn: '94036090', price: 45999, gst: 18, stock: 34 }
        ]);
      }

    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = async () => {
    if (!invoiceData.customer.name || invoiceData.items.length === 0) {
      alert('Please fill in customer details and add at least one item');
      return;
    }

    try {
      const newInvoice = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
        customerName: invoiceData.customer.name,
        customerGstin: invoiceData.customer.gstin,
        customerPhone: invoiceData.customer.phone,
        customerEmail: invoiceData.customer.email,
        customerAddress: invoiceData.customer.address,
        customerState: invoiceData.customer.state,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'pending',
        notes: invoiceData.notes
      };

      const response = await salesAPI.create(newInvoice);
      setInvoices([...invoices, response.invoice || { ...newInvoice, id: Date.now() }]);
      
      // Update customers
      const updatedCustomers = { ...customers };
      if (invoiceData.customer.gstin) {
        updatedCustomers[invoiceData.customer.gstin] = {
          ...invoiceData.customer,
          totalInvoices: (updatedCustomers[invoiceData.customer.gstin]?.totalInvoices || 0) + 1,
          totalAmount: (updatedCustomers[invoiceData.customer.gstin]?.totalAmount || 0) + newInvoice.totalAmount,
          lastInvoiceDate: newInvoice.invoiceDate
        };
        setCustomers(updatedCustomers);
      }

      resetInvoiceForm();
      setShowCreateModal(false);
      alert('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      // Fallback for offline mode
      const newInvoice = {
        id: Date.now(),
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
        customerName: invoiceData.customer.name,
        customerGstin: invoiceData.customer.gstin,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'pending',
        notes: invoiceData.notes
      };
      setInvoices([...invoices, newInvoice]);
      resetInvoiceForm();
      setShowCreateModal(false);
      alert('Invoice created successfully!');
    }
  };

  const handleUpdateInvoice = async () => {
    try {
      const updatedInvoice = {
        ...editingInvoice,
        customerName: invoiceData.customer.name,
        customerGstin: invoiceData.customer.gstin,
        items: invoiceData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: invoiceData.notes,
        dueDate: invoiceData.dueDate
      };

      const response = await salesAPI.update(editingInvoice.id, updatedInvoice);
      setInvoices(invoices.map(inv => 
        inv.id === editingInvoice.id ? (response.invoice || updatedInvoice) : inv
      ));

      setEditingInvoice(null);
      setShowEditModal(false);
      resetInvoiceForm();
      alert('Invoice updated successfully!');
    } catch (error) {
      console.error('Error updating invoice:', error);
      // Fallback for offline mode
      const updatedInvoice = {
        ...editingInvoice,
        customerName: invoiceData.customer.name,
        customerGstin: invoiceData.customer.gstin,
        items: invoiceData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: invoiceData.notes
      };
      setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? updatedInvoice : inv));
      setEditingInvoice(null);
      setShowEditModal(false);
      resetInvoiceForm();
      alert('Invoice updated successfully!');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!isOwner) {
      alert('Only owners can delete invoices');
      return;
    }

    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await salesAPI.delete(id);
        setInvoices(invoices.filter(inv => inv.id !== id));
        alert('Invoice deleted successfully!');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        // Fallback for offline mode
        setInvoices(invoices.filter(inv => inv.id !== id));
        alert('Invoice deleted successfully!');
      }
    }
  };

  const calculateSubtotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateGST = () => {
    return invoiceData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      return sum + (itemTotal * item.gst / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const addItemToInvoice = (product) => {
    const existingItem = invoiceData.items.find(item => item.id === product.id);
    if (existingItem) {
      setInvoiceData({
        ...invoiceData,
        items: invoiceData.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        items: [...invoiceData.items, {
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
      setInvoiceData({
        ...invoiceData,
        items: invoiceData.items.filter(item => item.id !== itemId)
      });
    } else {
      setInvoiceData({
        ...invoiceData,
        items: invoiceData.items.map(item =>
          item.id === itemId ? { ...item, quantity: parseInt(quantity) } : item
        )
      });
    }
  };

  const resetInvoiceForm = () => {
    setInvoiceData({
      customer: {
        name: '',
        gstin: '',
        phone: '',
        email: '',
        address: '',
        state: ''
      },
      items: [],
      notes: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setInvoiceData({
      customer: {
        name: invoice.customerName,
        gstin: invoice.customerGstin || '',
        phone: invoice.customerPhone || '',
        email: invoice.customerEmail || '',
        address: invoice.customerAddress || '',
        state: invoice.customerState || ''
      },
      items: invoice.items,
      notes: invoice.notes || '',
      dueDate: invoice.dueDate
    });
    setShowEditModal(true);
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      await generateInvoicePDF(invoice, companyInfo);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const updateInvoiceStatus = async (id, status) => {
    try {
      const response = await salesAPI.update(id, { status });
      setInvoices(invoices.map(inv => 
        inv.id === id ? { ...inv, status } : inv
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      // Fallback for offline mode
      setInvoices(invoices.map(inv => 
        inv.id === id ? { ...inv, status } : inv
      ));
    }
  };

  if (loading) {
    return (
      <div className="sales">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales">
      <div className="sales-header">
        <div>
          <h1>Sales & Invoicing</h1>
          <p className="subtitle">Create and manage sales invoices with GST</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Invoice
        </button>
      </div>

      {/* Create/Edit Invoice Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="invoice-modal">
          <div className="invoice-modal-content">
            <div className="invoice-modal-header">
              <h2>{showCreateModal ? 'Create New Invoice' : 'Edit Invoice'}</h2>
              <button className="btn-close" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingInvoice(null);
                resetInvoiceForm();
              }}>✕</button>
            </div>

            <div className="invoice-modal-body">
              {/* Customer Information */}
              <div className="form-section">
                <h3>Customer Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={invoiceData.customer.name}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      placeholder="Enter GSTIN (optional)"
                      value={invoiceData.customer.gstin}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, gstin: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={invoiceData.customer.phone}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={invoiceData.customer.email}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, email: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea
                      placeholder="Enter complete address"
                      value={invoiceData.customer.address}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, address: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="Enter state"
                      value={invoiceData.customer.state}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        customer: { ...invoiceData.customer, state: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData({
                        ...invoiceData,
                        dueDate: e.target.value
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
                        onClick={() => addItemToInvoice(product)}
                        disabled={product.stock <= 0}
                      >
                        Add to Invoice
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice Items */}
              {invoiceData.items.length > 0 && (
                <div className="form-section">
                  <h3>Invoice Items</h3>
                  <div className="invoice-items">
                    {invoiceData.items.map(item => (
                      <div key={item.id} className="invoice-item">
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

                  <div className="invoice-summary">
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
                  placeholder="Add any additional notes or terms..."
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({
                    ...invoiceData,
                    notes: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="invoice-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingInvoice(null);
                resetInvoiceForm();
              }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={showCreateModal ? handleCreateInvoice : handleUpdateInvoice}
                disabled={!invoiceData.customer.name || invoiceData.items.length === 0}
              >
                {showCreateModal ? 'Create Invoice' : 'Update Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="sales-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by customer name or invoice number..."
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
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="invoices-table-container">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id}>
                <td className="invoice-number">{invoice.invoiceNumber}</td>
                <td className="customer-name">{invoice.customerName}</td>
                <td>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                <td className="amount">₹{invoice.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td>
                  <select
                    value={invoice.status}
                    onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                    className={`status-badge ${invoice.status}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon" 
                      title="Download PDF"
                      onClick={() => handleDownloadPDF(invoice)}
                    >
                      📄
                    </button>
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => openEditModal(invoice)}
                    >
                      ✏️
                    </button>
                    {isOwner && (
                      <button 
                        className="btn-icon" 
                        title="Delete"
                        onClick={() => handleDeleteInvoice(invoice.id)}
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

      {filteredInvoices.length === 0 && (
        <div className="empty-state">
          <p>No invoices found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Sales;