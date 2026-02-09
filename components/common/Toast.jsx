'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Icon from './Icon';
import { toastVariants } from '@/components/MotionVariants';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const TOAST_DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      duration: toast.duration ?? TOAST_DURATION,
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message, options = {}) => 
      addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => 
      addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => 
      addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => 
      addToast({ type: 'info', message, ...options }),
    dismiss: removeToast,
    dismissAll: () => setToasts([])
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onDismiss={() => onDismiss(toast.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { type, message, title, duration } = toast;

  const typeConfig = {
    success: {
      icon: 'check-circle',
      className: 'bg-success text-success-foreground',
      progressColor: 'bg-success-foreground/30'
    },
    error: {
      icon: 'x-circle',
      className: 'bg-destructive text-destructive-foreground',
      progressColor: 'bg-destructive-foreground/30'
    },
    warning: {
      icon: 'alert-triangle',
      className: 'bg-warning text-warning-foreground',
      progressColor: 'bg-warning-foreground/30'
    },
    info: {
      icon: 'info',
      className: 'bg-info text-info-foreground',
      progressColor: 'bg-info-foreground/30'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'pointer-events-auto relative min-w-[300px] max-w-md rounded-lg shadow-lg overflow-hidden',
        config.className
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon name={config.icon} size={20} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-sm">{title}</p>
          )}
          <p className={cn('text-sm', title && 'mt-1 opacity-90')}>
            {message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className={cn('h-1', config.progressColor)}>
          <div 
            className="h-full bg-current opacity-50 toast-progress"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default ToastProvider;
