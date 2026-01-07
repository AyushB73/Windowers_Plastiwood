import { useState } from 'react';
import './Header.css';

const Header = ({ currentPage, setCurrentPage, userRole, userName, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (pageId) => {
    setCurrentPage(pageId);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="hamburger-btn" onClick={toggleMenu}>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
        
        <div className="header-center">
          <div className="logo-container">
            <span className="logo-icon">🏭</span>
            <h1 className="logo-text">Windowers Plastiwood</h1>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">{userRole === 'owner' ? '👑' : '👤'}</div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Overlay */}
      <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}>
        <nav className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="menu-header">
            <div className="menu-logo">
              <span className="menu-logo-icon">🏭</span>
              <span className="menu-logo-text">Windowers</span>
            </div>
            <button className="menu-close-btn" onClick={() => setIsMenuOpen(false)}>✕</button>
          </div>
          
          <div className="menu-items">
            {menuItems.map(item => (
              <button
                key={item.id}
                className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item.id)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </button>
            ))}
          </div>
          
          <div className="menu-footer">
            <div className="menu-user-info">
              <div className="menu-user-avatar">{userRole === 'owner' ? '👑' : '👤'}</div>
              <div className="menu-user-details">
                <p className="menu-user-name">{userName}</p>
              </div>
            </div>
            <button className="menu-logout-btn" onClick={onLogout}>
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Header;