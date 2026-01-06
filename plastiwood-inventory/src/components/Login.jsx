import { useState } from 'react';
import { useObjectDataSync } from '../hooks/useDataSync';
import { DATA_KEYS } from '../utils/dataSync';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Use synchronized user data
  const { data: users } = useObjectDataSync(DATA_KEYS.USERS, {
    pramod: { password: 'owner123', role: 'owner', name: 'Pramod', email: 'pramod@plastiwood.com', phone: '+91 9876543210' },
    staff: { password: 'staff123', role: 'staff', name: 'Staff', email: 'staff@plastiwood.com', phone: '+91 9876543211' }
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const user = users[username.toLowerCase()];
    if (user && user.password === password) {
      const userData = {
        username: username.toLowerCase(),
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone
      };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      onLogin(userData);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🏭</div>
          <h1>Windowers Plastiwood</h1>
          <p>Inventory Management System</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
