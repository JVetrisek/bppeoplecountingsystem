import { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);

const TOAST_CLASSES = {
  success: 'alert alert-success alert-soft border border-current',
  error: 'alert alert-error alert-soft border border-current',
  info: 'alert alert-info alert-soft border border-current',
  warning: 'alert alert-warning alert-soft border border-current',
};

const TOAST_ICONS = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'information-circle',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast toast-bottom toast-center z-50">
        {toasts.map(t => (
          <div key={t.id} role="alert" className={TOAST_CLASSES[t.type] ?? TOAST_CLASSES.info}>
            <Icon name={TOAST_ICONS[t.type] ?? TOAST_ICONS.info} className="size-5" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
