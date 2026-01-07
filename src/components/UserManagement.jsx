import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      // Set default users if API fails
      setUsers([
        { id: 1, username: 'pramod', role: 'owner', createdAt: '2026-01-01' },
        { id: 2, username: 'staff', role: 'staff', createdAt: '2026-01-01' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!formData.username || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const newUser = {
        username: formData.username,
        password: formData.password,
        role: formData.role
      };

      const response = await usersAPI.create(newUser);
      setUsers([...users, response.user || { ...newUser, id: Date.now(), createdAt: new Date().toISOString() }]);

      resetForm();
      setShowAddModal(false);
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.message.includes('already exists')) {
        alert('Username already exists. Please choose a different username.');
      } else {
        alert('Error creating user: ' + error.message);
      }
    }
  };

  const handleEditUser = async () => {
    if (!formData.username) {
      alert('Please fill in username');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const updatedUser = {
        username: formData.username,
        role: formData.role
      };

      // Only include password if it's being changed
      if (formData.password) {
        updatedUser.password = formData.password;
      }

      const response = await usersAPI.update(editingUser.id, updatedUser);
      setUsers(users.map(user => 
        user.id === editingUser.id ? (response.user || { ...user, ...updatedUser }) : user
      ));

      setEditingUser(null);
      setShowEditModal(false);
      resetForm();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.message.includes('already exists')) {
        alert('Username already exists. Please choose a different username.');
      } else {
        alert('Error updating user: ' + error.message);
      }
    }
  };

  const handleDeleteUser = async (id) => {
    const userToDelete = users.find(user => user.id === id);
    
    if (userToDelete.role === 'owner') {
      alert('Cannot delete owner account');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(id);
        setUsers(users.filter(user => user.id !== id));
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      role: user.role
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      role: 'staff'
    });
  };

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div>
          <h1>User Management</h1>
          <p className="subtitle">Manage system users and their permissions</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add New User
        </button>
      </div>

      {/* Add/Edit User Modal */}
      {(showAddModal || showEditModal) && (
        <div className="user-modal">
          <div className="user-modal-content">
            <div className="user-modal-header">
              <h2>{showAddModal ? 'Add New User' : 'Edit User'}</h2>
              <button className="btn-close" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingUser(null);
                resetForm();
              }}>✕</button>
            </div>

            <div className="user-modal-body">
              <div className="form-section">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{showAddModal ? 'Password *' : 'New Password (leave blank to keep current)'}</label>
                  <input
                    type="password"
                    placeholder={showAddModal ? "Enter password" : "Enter new password (optional)"}
                    value={formData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{showAddModal ? 'Confirm Password *' : 'Confirm New Password'}</label>
                  <input
                    type="password"
                    placeholder={showAddModal ? "Confirm password" : "Confirm new password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                  >
                    <option value="staff">Staff</option>
                    <option value="owner">Owner</option>
                  </select>
                  <small className="form-help">
                    Staff: Limited access to inventory and sales<br/>
                    Owner: Full access to all features including user management
                  </small>
                </div>
              </div>
            </div>

            <div className="user-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setEditingUser(null);
                resetForm();
              }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={showAddModal ? handleAddUser : handleEditUser}
              >
                {showAddModal ? 'Add User' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="user-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="username">{user.username}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'owner' ? '👑 Owner' : '👤 Staff'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => openEditModal(user)}
                    >
                      ✏️
                    </button>
                    {user.role !== 'owner' && (
                      <button 
                        className="btn-icon" 
                        title="Delete"
                        onClick={() => handleDeleteUser(user.id)}
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

      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <p>No users found matching your search criteria.</p>
        </div>
      )}

      {/* User Statistics */}
      <div className="user-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <h3>{users.filter(u => u.role === 'owner').length}</h3>
            <p>Owners</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>{users.filter(u => u.role === 'staff').length}</h3>
            <p>Staff Members</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;