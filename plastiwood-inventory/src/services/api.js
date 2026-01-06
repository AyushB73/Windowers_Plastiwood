// API Configuration
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-backend-url.railway.app/api'  // Replace with your Railway backend URL
  : 'http://localhost:3001/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        removeAuthToken();
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },
  
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      removeAuthToken();
    }
  },
  
  getCurrentUser: async () => {
    return await apiRequest('/auth/me');
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return await apiRequest('/users');
  },
  
  create: async (userData) => {
    return await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  update: async (id, userData) => {
    return await apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Inventory API
export const inventoryAPI = {
  getAll: async () => {
    return await apiRequest('/inventory');
  },
  
  create: async (itemData) => {
    return await apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },
  
  update: async (id, itemData) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },
  
  updateStock: async (id, stock) => {
    return await apiRequest(`/inventory/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
};

// Purchases API
export const purchasesAPI = {
  getAll: async () => {
    return await apiRequest('/purchases');
  },
  
  create: async (purchaseData) => {
    return await apiRequest('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },
  
  update: async (id, purchaseData) => {
    return await apiRequest(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(purchaseData),
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/purchases/${id}`, {
      method: 'DELETE',
    });
  },
  
  getSuppliers: async () => {
    return await apiRequest('/purchases/suppliers');
  },
  
  deleteSupplier: async (gstin) => {
    return await apiRequest(`/purchases/suppliers/${gstin}`, {
      method: 'DELETE',
    });
  },
};

// Sales API
export const salesAPI = {
  getAll: async () => {
    return await apiRequest('/sales');
  },
  
  create: async (invoiceData) => {
    return await apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },
  
  update: async (id, invoiceData) => {
    return await apiRequest(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/sales/${id}`, {
      method: 'DELETE',
    });
  },
  
  getCustomers: async () => {
    return await apiRequest('/sales/customers');
  },
  
  deleteCustomer: async (gstin) => {
    return await apiRequest(`/sales/customers/${gstin}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const ordersAPI = {
  getAll: async () => {
    return await apiRequest('/orders');
  },
  
  create: async (orderData) => {
    return await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  update: async (id, orderData) => {
    return await apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Company API
export const companyAPI = {
  get: async () => {
    return await apiRequest('/company');
  },
  
  update: async (companyData) => {
    return await apiRequest('/company', {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  },
};

// Export auth token helpers
export { getAuthToken, setAuthToken, removeAuthToken };