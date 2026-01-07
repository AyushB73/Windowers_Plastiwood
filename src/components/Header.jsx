import { useState } from 'react';
import './Header.css';

const Header = ({ user, currentTab, onTabChange, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    ...(user.role === 'owner' ? [{ id: 'purchases', label: 'Purchases', icon: '🛒' }] : []),
    { id: 'orders', label: 'Orders', icon: '📋' },
    ...(user.role === 'owner' ? [{ id: 'users', label: 'Users', icon: '👥' }] : [])
  ];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <div className="logo">
            <h1>Windowers Plastiwood</h1>
          </div>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`menu-item ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="menu-icon">{tab.icon}</span>
            <span className="menu-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;