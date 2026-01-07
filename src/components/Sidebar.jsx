import './Sidebar.css';

const Sidebar = ({ currentPage, setCurrentPage, userRole, userName, onLogout }) => {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['owner'] },
    { id: 'inventory', label: 'Inventory', icon: '📦', roles: ['owner', 'staff'] },
    { id: 'purchases', label: 'Purchases', icon: '🛒', roles: ['owner'] },
    { id: 'orders', label: 'Orders', icon: '📋', roles: ['owner', 'staff'] },
    { id: 'sales', label: 'Sales & GST', icon: '💰', roles: ['owner', 'staff'] },
    { id: 'users', label: 'User Management', icon: '👥', roles: ['owner'] }
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">🏭 Plastiwood</h1>
        <p className="tagline">Inventory Management</p>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{userRole === 'owner' ? '👑' : '👤'}</div>
          <div className="user-details">
            <p className="user-name">{userName}</p>
            <p className="user-role">{userRole === 'owner' ? 'Owner' : 'Staff'}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
