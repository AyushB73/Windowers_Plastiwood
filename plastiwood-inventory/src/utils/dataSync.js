// Data synchronization utility for real-time updates across all user sessions
class DataSync {
  constructor() {
    this.listeners = new Map();
    this.setupStorageListener();
  }

  // Setup storage event listener for cross-tab synchronization
  setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key && this.listeners.has(e.key)) {
        const callbacks = this.listeners.get(e.key);
        const newValue = e.newValue ? JSON.parse(e.newValue) : null;
        callbacks.forEach(callback => callback(newValue));
      }
    });
  }

  // Subscribe to data changes
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Get data from localStorage
  getData(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  }

  // Set data to localStorage and notify all subscribers
  setData(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(key, jsonValue);
      
      // Notify local subscribers immediately
      if (this.listeners.has(key)) {
        const callbacks = this.listeners.get(key);
        callbacks.forEach(callback => callback(value));
      }
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key, value }
      }));
      
      return true;
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
      return false;
    }
  }

  // Update specific item in an array
  updateArrayItem(key, itemId, updatedItem, idField = 'id') {
    const data = this.getData(key, []);
    const index = data.findIndex(item => item[idField] === itemId);
    
    if (index !== -1) {
      data[index] = { ...data[index], ...updatedItem };
      this.setData(key, data);
      return true;
    }
    return false;
  }

  // Add item to array
  addArrayItem(key, newItem) {
    const data = this.getData(key, []);
    data.push(newItem);
    this.setData(key, data);
    return true;
  }

  // Remove item from array
  removeArrayItem(key, itemId, idField = 'id') {
    const data = this.getData(key, []);
    const filteredData = data.filter(item => item[idField] !== itemId);
    this.setData(key, filteredData);
    return true;
  }

  // Update object property
  updateObjectProperty(key, property, value) {
    const data = this.getData(key, {});
    data[property] = value;
    this.setData(key, data);
    return true;
  }

  // Batch update multiple keys
  batchUpdate(updates) {
    const results = {};
    Object.entries(updates).forEach(([key, value]) => {
      results[key] = this.setData(key, value);
    });
    return results;
  }

  // Clear all data (useful for logout)
  clearAllData() {
    const keys = [
      'inventory', 'purchases', 'invoices', 'orders', 
      'suppliers', 'customers', 'companyInfo'
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      if (this.listeners.has(key)) {
        const callbacks = this.listeners.get(key);
        callbacks.forEach(callback => callback(null));
      }
    });
  }
}

// Create singleton instance
const dataSync = new DataSync();

// Setup same-tab event listener
window.addEventListener('localStorageChange', (e) => {
  const { key, value } = e.detail;
  if (dataSync.listeners.has(key)) {
    const callbacks = dataSync.listeners.get(key);
    callbacks.forEach(callback => callback(value));
  }
});

export default dataSync;

// Export commonly used data keys
export const DATA_KEYS = {
  INVENTORY: 'inventory',
  PURCHASES: 'purchases',
  INVOICES: 'invoices',
  ORDERS: 'orders',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  COMPANY_INFO: 'companyInfo',
  CURRENT_USER: 'currentUser',
  USERS: 'users'
};