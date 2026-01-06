import { useDataNotifications } from '../hooks/useDataSync';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { notifications, removeNotification } = useDataNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-center">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification ${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button className="notification-close">×</button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;