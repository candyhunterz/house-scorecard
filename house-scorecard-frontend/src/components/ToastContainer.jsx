import React from 'react';
import { useToast } from '../contexts/ToastContext';
import './ToastContainer.css';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onClose={() => removeToast(toast.id)} 
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌'; 
      case 'warning': return '⚠️';
      case 'info': default: return 'ℹ️';
    }
  };

  return (
    <div className={`toast toast--${toast.type}`}>
      <div className="toast__content">
        <span className="toast__icon">{getIcon(toast.type)}</span>
        <span className="toast__message">{toast.message}</span>
      </div>
      <button 
        className="toast__close" 
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default ToastContainer;