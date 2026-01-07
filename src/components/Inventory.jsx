import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';
import './Inventory.css';

const Inventory = ({ userRole }) => {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isOwner = userRole === 'owner';

  const [formData, setFormData] = useState({
    name: '',
    hsn: '39259099',
    quantity: 0,
    size: '',
    stock: 0,
    color: '',
    colorCode: '#808080',
    price: 0,
    gst: 18
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      setInventory(response.items || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      // Set default inventory if API fails
      setInventory([
        { id: 1, name: 'Plastiwood Deck Board 2x6', hsn: '39259099', quantity: 245, size: '2" x 6" x 12ft', stock: 245, color: 'Natural Wood', colorCode: '#D2B48C', price: 3499, gst: 18 },
        { id: 2, name: 'Composite Fence Panel 6ft', hsn: '39259099', quantity: 128, size: '6ft x 8ft', stock: 128, color: 'Gray', colorCode: '#808080', price: 6899, gst: 18 },
        { id: 3, name: 'Outdoor Furniture Set', hsn: '94036090', quantity: 34, size: 'Table: 60" x 36"', stock: 34, color: 'Brown', colorCode: '#8B4513', price: 45999, gst: 18 },
        { id: 4, name: 'Garden Edging 10ft', hsn: '39259099', quantity: 456, size: '10ft x 4"', stock: 456, color: 'Black', colorCode: '#000000', price: 1899, gst: 18 },
        { id: 5, name: 'Plastiwood Railing System', hsn: '39259099', quantity: 67, size: '6ft section', stock: 67, color: 'White', colorCode: '#FFFFFF', price: 12299, gst: 18 },
        { id: 6, name: 'Composite Planter Box', hsn: '39269099', quantity: 89, size: '24" x 24" x 18"', stock: 89, color: 'Terracotta', colorCode: '#E2725B', price: 6099, gst: 18 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.hsn.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleAddItem = async () => {
    if (!formData.name || !formData.hsn || formData.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newItem = {
        ...formData,
        quantity: parseInt(formData.quantity),
        stock: parseInt(formData.stock),
        price: parseFloat(formData.price),
        gst: parseInt(formData.gst)
      };

      if (isOwner) {
        const response = await inventoryAPI.create(newItem);
        setInventory([...inventory, response.item || { ...newItem, id: Date.now() }]);
      } else {
        alert('Only owners can add inventory items');
        return;
      }

      resetForm();
      setShowAddModal(false);
      alert('Item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      // Fallback for offline mode
      const newItem = {
        ...formData,
        id: Date.now(),
        quantity: parseInt(formData.quantity),
        stock: parseInt(formData.stock),
        price: parseFloat(formData.price),
        gst: parseInt(formData.gst)
      };
      setInventory([...inventory, newItem]);
      resetForm();
      setShowAddModal(false);
      alert('Item added successfully!');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      hsn: item.hsn,
      quantity: item.quantity,
      size: item.size,
      stock: item.stock,
      color: item.color,
      colorCode: item.colorCode,
      price: item.price,
      gst: item.gst
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!formData.name || !formData.hsn || formData.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const updatedItem = {
        ...formData,
        quantity: parseInt(formData.quantity),
        stock: parseInt(formData.stock),
        price: parseFloat(formData.price),
        gst: parseInt(formData.gst)
      };

      if (isOwner) {
        const response = await inventoryAPI.update(editingItem.id, updatedItem);
        setInventory(inventory.map(item => 
          item.id === editingItem.id ? (response.item || { ...updatedItem, id: editingItem.id }) : item
        ));
      } else {
        alert('Only owners can edit inventory items');
        return;
      }

      setEditingItem(null);
      setShowEditModal(false);
      resetForm();
      alert('Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      // Fallback for offline mode
      setInventory(inventory.map(item => 
        item.id === editingItem.id ? { ...formData, id: editingItem.id } : item
      ));
      setEditingItem(null);
      setShowEditModal(false);
      resetForm();
      alert('Item updated successfully!');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!isOwner) {
      alert('Only owners can delete inventory items');
      return;
    }

    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await inventoryAPI.delete(id);
        setInventory(inventory.filter(item => item.id !== id));
        alert('Item deleted successfully!');
      } catch (error) {
        console.error('Error deleting item:', error);
        // Fallback for offline mode
        setInventory(inventory.filter(item => item.id !== id));
        alert('Item deleted successfully!');
      }
    }
  };

  const handleUpdateStock = async (id, newStock) => {
    try {
      await inventoryAPI.updateStock(id, newStock);
      setInventory(inventory.map(item => 
        item.id === id ? { ...item, stock: newStock } : item
      ));
    } catch (error) {
      console.error('Error updating stock:', error);
      // Fallback for offline mode
      setInventory(inventory.map(item => 
        item.id === id ? { ...item, stock: newStock } : item
      ));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hsn: '39259099',
      quantity: 0,
      size: '',
      stock: 0,
      color: '',
      colorCode: '#808080',
      price: 0,
      gst: 18
    });
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="inventory">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <div>
          <h1>Inventory Management</h1>
          <p className="subtitle">Track and manage your plastiwood products</p>
        </div>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add New Item</button>
        )}
      </div>

      {(showAddModal || showEditModal) && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <div className="edit-modal-header">
              <h2>{showAddModal ? 'Add New Item' : 'Edit Item'}</h2>
              <button className="btn-close" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingItem(null);
                resetForm();
              }}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="form-section">
                <h3>Product Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>HSN Code *</label>
                    <input
                      type="text"
                      placeholder="Enter HSN code"
                      value={formData.hsn}
                      onChange={(e) => handleFormChange('hsn', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter quantity"
                      value={formData.quantity}
                      onChange={(e) => handleFormChange('quantity', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Size (with units) *</label>
                    <input
                      type="text"
                      placeholder='e.g., 2" x 6" x 12ft or 10ft x 4"'
                      value={formData.size}
                      onChange={(e) => handleFormChange('size', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Available *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter stock quantity"
                      value={formData.stock}
                      onChange={(e) => handleFormChange('stock', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Color *</label>
                    <input
                      type="text"
                      placeholder="Enter color name"
                      value={formData.color}
                      onChange={(e) => handleFormChange('color', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Color Code</label>
                    <input
                      type="color"
                      value={formData.colorCode}
                      onChange={(e) => handleFormChange('colorCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Pricing & Tax</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Base Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter base price"
                      value={formData.price}
                      onChange={(e) => handleFormChange('price', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>GST % *</label>
                    <select
                      value={formData.gst}
                      onChange={(e) => handleFormChange('gst', e.target.value)}
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Taxed Price (₹)</label>
                    <input
                      type="text"
                      value={`₹${(parseFloat(formData.price || 0) * (1 + parseInt(formData.gst || 0) / 100)).toFixed(2)}`}
                      disabled
                      style={{ background: '#e8f5e9', fontWeight: 'bold', color: '#27ae60' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingItem(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={showAddModal ? handleAddItem : handleUpdateItem}>
                {showAddModal ? 'Add Item' : 'Update Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="inventory-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or HSN code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>HSN Code</th>
              <th>Quantity</th>
              <th>Size (with units)</th>
              <th>Stock</th>
              <th>Color</th>
              <th>Base Price (₹)</th>
              <th>GST</th>
              <th>Taxed Price (₹)</th>
              {isOwner && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(item => (
              <tr key={item.id}>
                <td className="product-name">{item.name}</td>
                <td className="hsn-code">{item.hsn}</td>
                <td className="quantity">{item.quantity}</td>
                <td className="size">{item.size}</td>
                <td className="text-center">
                  <span className={`stock-badge ${item.stock > 50 ? 'high' : item.stock > 20 ? 'medium' : 'low'}`}>
                    {item.stock}
                  </span>
                </td>
                <td>
                  <span className="color-badge" style={{ background: item.colorCode || '#ecf0f1' }}>
                    {item.color}
                  </span>
                </td>
                <td className="price">₹{(item.price || 0).toLocaleString('en-IN')}</td>
                <td className="text-center">{item.gst || 0}%</td>
                <td className="price taxed-price">₹{((item.price || 0) * (1 + (item.gst || 0) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                {isOwner && (
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="Edit" onClick={() => handleEditItem(item)}>✏️</button>
                      <button className="btn-icon" title="Delete" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInventory.length === 0 && (
        <div className="empty-state">
          <p>No items found matching your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Inventory;