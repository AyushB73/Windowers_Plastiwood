import { useState } from 'react';
import { useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import './UserManagement.css';

const UserManagement = ({ currentUser, onUserUpdate }) => {
  const { data: users, updateData: setUsers } = useObjectDataSync(DATA_KEYS.USERS, {
    pramod: { password: 'owner123', role: 'owner', name: 'Pramod', email: 'pramod@plastiwood.com', phone: '+91 9876543210' },
    staff: { password: 'staff123', role: 'staff', name: 'Staff', email: 'staff@plastiwood.com', phone: '+91 9876543211' }
  });

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newStaff, setNewStaff] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: ''
  });

  const handleAddStaff = () => {
    if (!newStaff.username || !newStaff.password || !newStaff.name) {
      alert('Please fill in all required fields');
      return;
    }

    if (users[newStaff.username.toLowerCase()]) {
      alert('Username already exists');
      return;
    }

    const updatedUsers = {
      ...users,
      [newStaff.username.toLowerCase()]: {
        password: newStaff.password,
        role: 'staff',
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.username
      }
    };

    setUsers(updatedUsers);
    setShowAddStaff(false);
    setNewStaff({ username: '', password: '', name: '', email: '', phone: '' });
    alert('Staff member added successfully!');
  };

  const handleEditUser = (username) => {
    setEditingUser({ 
      username, 
      originalUsername: username, // Store original username for comparison
      ...users[username] 
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser.name || !editingUser.password) {
      alert('Please fill in all required fields');
      return;
    }

    // For owner, username is also required
    if (editingUser.role === 'owner' && !editingUser.username.trim()) {
      alert('Username is required for owner account');
      return;
    }

    // Check if username is being changed
    const isUsernameChanged = editingUser.username !== editingUser.originalUsername;
    const newUsername = editingUser.username.toLowerCase();

    // If username is being changed, check if new username already exists
    if (isUsernameChanged && users[newUsername]) {
      alert('Username already exists');
      return;
    }

    const updatedUsers = { ...users };

    if (isUsernameChanged) {
      // Remove old username entry
      delete updatedUsers[editingUser.originalUsername];
      
      // Add new username entry
      updatedUsers[newUsername] = {
        ...users[editingUser.originalUsername],
        password: editingUser.password,
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.username
      };
    } else {
      // Just update existing entry
      updatedUsers[editingUser.username] = {
        ...users[editingUser.username],
        password: editingUser.password,
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.username
      };
    }

    setUsers(updatedUsers);
    
    // Update current user session if editing own profile
    if (editingUser.originalUsername === currentUser.username) {
      const updatedCurrentUser = {
        ...currentUser,
        username: newUsername,
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
      onUserUpdate(updatedCurrentUser);
      
      if (isUsernameChanged) {
        alert('Username changed successfully! You will need to use the new username for future logins.');
      }
    }

    setShowEditUser(false);
    setEditingUser(null);
    alert('User updated successfully!');
  };

  const handleDeleteStaff = (username) => {
    if (username === 'pramod') {
      alert('Cannot delete owner account');
      return;
    }

    if (window.confirm(`Are you sure you want to delete staff member "${users[username].name}"?`)) {
      const updatedUsers = { ...users };
      delete updatedUsers[username];
      setUsers(updatedUsers);
      alert('Staff member deleted successfully!');
    }
  };

  const staffMembers = Object.entries(users).filter(([username, user]) => user.role === 'staff');

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <p className="subtitle">Manage staff accounts and update login credentials</p>
        <button className="btn-primary" onClick={() => setShowAddStaff(true)}>
          + Add Staff Member
        </button>
      </div>

      {/* Owner Profile Section */}
      <div className="owner-section">
        <h2>Owner Profile</h2>
        <div className="user-card owner-card">
          <div className="user-avatar">👑</div>
          <div className="user-info">
            <h3>{users.pramod?.name || 'Pramod'}</h3>
            <p className="user-role">Owner</p>
            <p className="user-email">{users.pramod?.email || 'Not set'}</p>
            <p className="user-phone">{users.pramod?.phone || 'Not set'}</p>
          </div>
          <div className="user-actions">
            <button className="btn-secondary" onClick={() => handleEditUser('pramod')}>
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Staff Members Section */}
      <div className="staff-section">
        <h2>Staff Members ({staffMembers.length})</h2>
        {staffMembers.length > 0 ? (
          <div className="staff-grid">
            {staffMembers.map(([username, user]) => (
              <div key={username} className="user-card staff-card">
                <div className="user-avatar">👤</div>
                <div className="user-info">
                  <h3>{user.name}</h3>
                  <p className="user-role">Staff</p>
                  <p className="user-username">@{username}</p>
                  <p className="user-email">{user.email || 'Not set'}</p>
                  <p className="user-phone">{user.phone || 'Not set'}</p>
                  {user.createdAt && (
                    <p className="user-created">
                      Added: {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
                <div className="user-actions">
                  <button className="btn-secondary" onClick={() => handleEditUser(username)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-danger" onClick={() => handleDeleteStaff(username)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No staff members added yet. Click "Add Staff Member" to get started.</p>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Staff Member</h2>
              <button className="btn-close" onClick={() => setShowAddStaff(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={newStaff.username}
                    onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddStaff(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddStaff}>
                Add Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit {editingUser.role === 'owner' ? 'Owner Profile' : 'Staff Member'}</h2>
              <button className="btn-close" onClick={() => setShowEditUser(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Username {editingUser.role === 'owner' ? '*' : ''}</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    disabled={editingUser.role !== 'owner'}
                    style={editingUser.role !== 'owner' ? { background: '#f8f9fa', color: '#6c757d' } : {}}
                  />
                  {editingUser.role === 'owner' && (
                    <small style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      ⚠️ Changing username will require using the new username for future logins
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditUser(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleUpdateUser}>
                Update {editingUser.role === 'owner' ? 'Profile' : 'Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;