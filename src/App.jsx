import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Orders from './components/Orders';
import UserManagement from './components/UserManagement';
import Header from './components/Header';
import { authAPI } from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.user);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCurrentTab('dashboard');
    }
  };

  if (loading) {
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

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory userRole={user.role} />;
      case 'sales':
        return <Sales userRole={user.role} />;
      case 'purchases':
        return user.role === 'owner' ? <Purchases /> : <div>Access Denied</div>;
      case 'orders':
        return <Orders userRole={user.role} />;
      case 'users':
        return user.role === 'owner' ? <UserManagement /> : <div>Access Denied</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Header 
        user={user}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;