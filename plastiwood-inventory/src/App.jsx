import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Purchases from './components/Purchases';
import Orders from './components/Orders';
import Sales from './components/Sales';
import UserManagement from './components/UserManagement';
import Header from './components/Header';
import Login from './components/Login';
import NotificationCenter from './components/NotificationCenter';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing login on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Set default page based on role
    if (userData.role === 'staff') {
      setCurrentPage('orders');
    } else {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setCurrentPage('dashboard');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  // Check if user has access to a page
  const hasAccess = (page) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    
    // Staff can only access: inventory (view only), orders, sales
    const staffAllowedPages = ['inventory', 'orders', 'sales'];
    return staffAllowedPages.includes(page);
  };

  const renderPage = () => {
    // Check access before rendering
    if (!hasAccess(currentPage)) {
      // Redirect to first allowed page
      if (user?.role === 'staff') {
        setCurrentPage('orders');
        return <Orders userRole={user.role} />;
      }
      return <Dashboard />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory userRole={user?.role} />;
      case 'purchases':
        return <Purchases />;
      case 'orders':
        return <Orders userRole={user?.role} />;
      case 'sales':
        return <Sales userRole={user?.role} />;
      case 'users':
        return <UserManagement currentUser={user} onUserUpdate={handleUserUpdate} />;
      default:
        return user?.role === 'staff' ? <Orders userRole={user.role} /> : <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        userRole={user.role}
        userName={user.name}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {renderPage()}
      </main>
      <NotificationCenter />
    </div>
  );
}

export default App;
