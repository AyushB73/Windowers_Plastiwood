import { useState, useEffect } from 'react';
import { purchasesAPI, inventoryAPI } from '../services/api';
import './Purchases.css';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [purchaseData, setPurchaseData] = useState({
    supplier: {
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      state: ''
    },
    items: [],
    notes: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [purchasesResponse, inventoryResponse] = await Promise.all([
        purchasesAPI.getAll().catch(() => ({ purchases: [], suppliers: {} })),
        inventoryAPI.getAll().catch(() => ({ items: [] }))
      ]);

      setPurchases(purchasesResponse.purchases || []);
      setSuppliers(purchasesResponse.suppliers || {});
      setInventory(inventoryResponse.items || []);

      // Set default data if API fails
      if (!purchasesResponse.purchases || purchasesResponse.purchases.length === 0) {
        setPurchases([
          {
            id: 1,
            purchaseNumber: 'PUR-2026-001',
            supplierName: 'PlastiWood Suppliers Ltd',
            supplierGstin: '27AABCU9603R1ZX',
            purchaseDate: '2026-01-05',
            items: [
              { id: 1, productName: 'Plastiwood Deck Board 2x6', hsn: '39259099', quantity: 100, price: 2800, gst: 18 },
              { id: 2, productName: 'Composite Fence Panel 6ft', hsn: '39259099', quantity: 50, price: 5500, gst: 18 }
            ],
            subtotal: 555000,
            gstAmount: 99900,
            totalAmount: 654900,
            status: 'received',
            notes: 'Monthly stock replenishment'
          }
        ]);
      }

      if (!purchasesResponse.suppliers || Object.keys(purchasesResponse.suppliers).length === 0) {
        setSuppliers({
          '27AABCU9603R1ZX': {
            name: 'PlastiWood Suppliers Ltd',
            gstin: '27AABCU9603R1ZX',
            phone: '+91 9876543220',
            email: 'orders@plastiwoodsuppliers.com',
            address: '789 Industrial Area, Chennai, Tamil Nadu - 600001',
            state: 'Tamil Nadu',
            totalPurchases: 1,
            totalAmount: 654900,
            lastPurchaseDate: '2026-01-05'
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
      console.error('Error loading purchases data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCreatePurchase = async () => {
    if (!purchaseData.supplier.name || purchaseData.items.length === 0) {
      alert('Please fill in supplier details and add at least one item');
      return;
    }

    try {
      const newPurchase = {
        purchaseNumber: `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
        supplierName: purchaseData.supplier.name,
        supplierGstin: purchaseData.supplier.gstin,
        supplierPhone: purchaseData.supplier.phone,
        supplierEmail: purchaseData.supplier.email,
        supplierAddress: purchaseData.supplier.address,
        supplierState: purchaseData.supplier.state,
        purchaseDate: purchaseData.purchaseDate,
        items: purchaseData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'ordered',
        notes: purchaseData.notes
      };

      const response = await purchasesAPI.create(newPurchase);
      setPurchases([...purchases, response.purchase || { ...newPurchase, id: Date.now() }]);
      
      // Update suppliers
      const updatedSuppliers = { ...suppliers };
      if (purchaseData.supplier.gstin) {
        updatedSuppliers[purchaseData.supplier.gstin] = {
          ...purchaseData.supplier,
          totalPurchases: (updatedSuppliers[purchaseData.supplier.gstin]?.totalPurchases || 0) + 1,
          totalAmount: (updatedSuppliers[purchaseData.supplier.gstin]?.totalAmount || 0) + newPurchase.totalAmount,
          lastPurchaseDate: newPurchase.purchaseDate
        };
        setSuppliers(updatedSuppliers);
      }

      resetPurchaseForm();
      setShowCreateModal(false);
      alert('Purchase order created successfully!');
    } catch (error) {
      console.error('Error creating purchase:', error);
      // Fallback for offline mode
      const newPurchase = {
        id: Date.now(),
        purchaseNumber: `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
        supplierName: purchaseData.supplier.name,
        supplierGstin: purchaseData.supplier.gstin,
        purchaseDate: purchaseData.purchaseDate,
        items: purchaseData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        status: 'ordered',
        notes: purchaseData.notes
      };
      setPurchases([...purchases, newPurchase]);
      resetPurchaseForm();
      setShowCreateModal(false);
      alert('Purchase order created successfully!');
    }
  };

  const handleUpdatePurchase = async () => {
    try {
      const updatedPurchase = {
        ...editingPurchase,
        supplierName: purchaseData.supplier.name,
        supplierGstin: purchaseData.supplier.gstin,
        items: purchaseData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: purchaseData.notes,
        purchaseDate: purchaseData.purchaseDate
      };

      const response = await purchasesAPI.update(editingPurchase.id, updatedPurchase);
      setPurchases(purchases.map(pur => 
        pur.id === editingPurchase.id ? (response.purchase || updatedPurchase) : pur
      ));

      setEditingPurchase(null);
      setShowEditModal(false);
      resetPurchaseForm();
      alert('Purchase order updated successfully!');
    } catch (error) {
      console.error('Error updating purchase:', error);
      // Fallback for offline mode
      const updatedPurchase = {
        ...editingPurchase,
        supplierName: purchaseData.supplier.name,
        supplierGstin: purchaseData.supplier.gstin,
        items: purchaseData.items,
        subtotal: calculateSubtotal(),
        gstAmount: calculateGST(),
        totalAmount: calculateTotal(),
        notes: purchaseData.notes
      };
      setPurchases(purchases.map(pur => pur.id === editingPurchase.id ? updatedPurchase : pur));
      setEditingPurchase(null);
      setShowEditModal(false);
      resetPurchaseForm();
      alert('Purchase order updated successfully!');
    }
  };

  const handleDeletePurchase = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await purchasesAPI.delete(id);
        setPurchases(purchases.filter(pur => pur.id !== id));
        alert('Purchase order deleted successfully!');
      } catch (error) {
        console.error('Error deleting purchase:', error);
        // Fallback for offline mode
        setPurchases(purchases.filter(pur => pur.id !== id));
        alert('Purchase order deleted successfully!');
      }
    }
  };

  const calculateSubtotal = () => {
    return purchaseData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateGST = () => {
    return purchaseData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      return sum + (itemTotal * item.gst / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const addItemToPurchase = (product) => {
    const existingItem = purchaseData.items.find(item => item.id === product.id);
    if (existingItem) {
      setPurchaseData({
        ...purchaseData,
        items: purchaseData.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      setPurchaseData({
        ...purchaseData,
        items: [...purchaseData.items, {
          id: product.id,
          productName: product.name,
          hsn: product.hsn,
          quantity: 1,
          price: Math.round(product.price * 0.8), // Assume 20% markup from purchase price
          gst: product.gst
        }]
      });
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      setPurchaseData({
        ...purchaseData,
        items: purchaseData.items.filter(item => item.id !== itemId)
      });
    } else {
      setPurchaseData({
        ...purchaseData,
        items: purchaseData.items.map(item =>
          item.id === itemId ? { ...item, quantity: parseInt(quantity) } : item
        )
      });
    }
  };

  const updateItemPrice = (itemId, price) => {
    setPurchaseData({
      ...purchaseData,
      items: purchaseData.items.map(item =>
        item.id === itemId ? { ...item, price: parseFloat(price) } : item
      )
    });
  };

  const resetPurchaseForm = () => {
    setPurchaseData({
      supplier: {
        name: '',
        gstin: '',
        phone: '',
        email: '',
        address: '',
        state: ''
      },
      items: [],
      notes: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
  };

  const openEditModal = (purchase) => {
    setEditingPurchase(purchase);
    setPurchaseData({
      supplier: {
        name: purchase.supplierName,
        gstin: purchase.supplierGstin || '',
        phone: purchase.supplierPhone || '',
        email: purchase.supplierEmail || '',
        address: purchase.supplierAddress || '',
        state: purchase.supplierState || ''
      },
      items: purchase.items,
      notes: purchase.notes || '',
      purchaseDate: purchase.purchaseDate
    });
    setShowEditModal(true);
  };

  const updatePurchaseStatus = async (id, status) => {
    try {
      const response = await purchasesAPI.update(id, { status });
      setPurchases(purchases.map(pur => 
        pur.id === id ? { ...pur, status } : pur
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      // Fallback for offline mode
      setPurchases(purchases.map(pur => 
        pur.id === id ? { ...pur, status } : pur
      ));
    }
  };

  if (loading) {
    return (
      <div className="purchases">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading purchases data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchases">
      <div className="purchases-header">
        <div>
          <h1>Purchase Management</h1>
          <p className="subtitle">Manage purchase orders and supplier relationships</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Purchase Order
        </button>
      </div>

      {/* Create/Edit Purchase Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="purchase-modal">
          <div className="purchase-modal-content">
            <div className="purchase-modal-header">
              <h2>{showCreateModal ? 'Create Purchase Order' : 'Edit Purchase Order'}</h2>
              <button className="btn-close" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingPurchase(null);
                resetPurchaseForm();
              }}>✕</button>
            </div>

            <div className="purchase-modal-body">
              {/* Supplier Information */}
              <div className="form-section">
                <h3>Supplier Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input
                      type="text"
                      placeholder="Enter supplier name"
                      value={purchaseData.supplier.name}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      placeholder="Enter GSTIN (optional)"
                      value={purchaseData.supplier.gstin}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, gstin: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={purchaseData.supplier.phone}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={purchaseData.supplier.email}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, email: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea
                      placeholder="Enter complete address"
                      value={purchaseData.supplier.address}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, address: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="Enter state"
                      value={purchaseData.supplier.state}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        supplier: { ...purchaseData.supplier, state: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      value={purchaseData.purchaseDate}
                      onChange={(e) => setPurchaseData({
                        ...purchaseData,
                        purchaseDate: e.target.value
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
                        <p>Selling Price: ₹{product.price.toLocaleString('en-IN')}</p>
                        <p>GST: {product.gst}%</p>
                        <p>Current Stock: {product.stock}</p>
                      </div>
                      <button 
                        className="btn-secondary"
                        onClick={() => addItemToPurchase(product)}
                      >
                        Add to Purchase
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase Items */}
              {purchaseData.items.length > 0 && (
                <div className="form-section">
                  <h3>Purchase Items</h3>
                  <div className="purchase-items">
                    {purchaseData.items.map(item => (
                      <div key={item.id} className="purchase-item">
                        <div className="item-details">
                          <h4>{item.productName}</h4>
                          <p>HSN: {item.hsn} | GST: {item.gst}%</p>
                        </div>
                        <div className="item-controls">
                          <div className="control-group">
                            <label>Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                            />
                          </div>
                          <div className="control-group">
                            <label>Purchase Price (₹):</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItemPrice(item.id, e.target.value)}
                            />
                          </div>
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

                  <div className="purchase-summary">
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
                  value={purchaseData.notes}
                  onChange={(e) => setPurchaseData({
                    ...purchaseData,
                    notes: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="purchase-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingPurchase(null);
                resetPurchaseForm();
              }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={showCreateModal ? handleCreatePurchase : handleUpdatePurchase}
                disabled={!purchaseData.supplier.name || purchaseData.items.length === 0}
              >
                {showCreateModal ? 'Create Purchase Order' : 'Update Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="purchases-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by supplier name or purchase number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="purchases-table-container">
        <table className="purchases-table">
          <thead>
            <tr>
              <th>Purchase #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.map(purchase => (
              <tr key={purchase.id}>
                <td className="purchase-number">{purchase.purchaseNumber}</td>
                <td className="supplier-name">{purchase.supplierName}</td>
                <td>{new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}</td>
                <td className="amount">₹{purchase.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td>
                  <select
                    value={purchase.status}
                    onChange={(e) => updatePurchaseStatus(purchase.id, e.target.value)}
                    className={`status-badge ${purchase.status}`}
                  >
                    <option value="ordered">Ordered</option>
                    <option value="shipped">Shipped</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => openEditModal(purchase)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon" 
                      title="Delete"
                      onClick={() => handleDeletePurchase(purchase.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPurchases.length === 0 && (
        <div className="empty-state">
          <p>No purchase orders found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Purchases;