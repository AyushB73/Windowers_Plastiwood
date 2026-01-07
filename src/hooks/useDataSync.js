import { useState, useEffect, useCallback } from 'react';
import dataSync from '../utils/dataSync';

// Custom hook for synchronized data management
export const useDataSync = (key, defaultValue = null) => {
  const [data, setData] = useState(() => dataSync.getData(key, defaultValue));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribe = dataSync.subscribe(key, (newData) => {
      setData(newData || defaultValue);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [key, defaultValue]);

  // Update data function
  const updateData = useCallback((newData) => {
    setIsLoading(true);
    const success = dataSync.setData(key, newData);
    setIsLoading(false);
    return success;
  }, [key]);

  // Update specific item in array
  const updateItem = useCallback((itemId, updatedItem, idField = 'id') => {
    setIsLoading(true);
    const success = dataSync.updateArrayItem(key, itemId, updatedItem, idField);
    setIsLoading(false);
    return success;
  }, [key]);

  // Add new item to array
  const addItem = useCallback((newItem) => {
    setIsLoading(true);
    const success = dataSync.addArrayItem(key, newItem);
    setIsLoading(false);
    return success;
  }, [key]);

  // Remove item from array
  const removeItem = useCallback((itemId, idField = 'id') => {
    setIsLoading(true);
    const success = dataSync.removeArrayItem(key, itemId, idField);
    setIsLoading(false);
    return success;
  }, [key]);

  return {
    data,
    updateData,
    updateItem,
    addItem,
    removeItem,
    isLoading
  };
};

// Hook for object data (like company info, suppliers, customers)
export const useObjectDataSync = (key, defaultValue = {}) => {
  const [data, setData] = useState(() => dataSync.getData(key, defaultValue));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = dataSync.subscribe(key, (newData) => {
      setData(newData || defaultValue);
    });

    return unsubscribe;
  }, [key, defaultValue]);

  const updateData = useCallback((newData) => {
    setIsLoading(true);
    const success = dataSync.setData(key, newData);
    setIsLoading(false);
    return success;
  }, [key]);

  const updateProperty = useCallback((property, value) => {
    setIsLoading(true);
    const success = dataSync.updateObjectProperty(key, property, value);
    setIsLoading(false);
    return success;
  }, [key]);

  return {
    data,
    updateData,
    updateProperty,
    isLoading
  };
};

// Hook for real-time notifications
export const useDataNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
};