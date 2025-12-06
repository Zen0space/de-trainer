import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
  }>({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
  });
  
  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToastConfig({
      visible: true,
      message,
      type,
      duration,
    });
  }, []);
  
  const showSuccess = useCallback((message: string, duration: number = 3000) => {
    showToast(message, 'success', duration);
  }, [showToast]);
  
  const showError = useCallback((message: string, duration: number = 4000) => {
    showToast(message, 'error', duration);
  }, [showToast]);
  
  const showWarning = useCallback((message: string, duration: number = 3500) => {
    showToast(message, 'warning', duration);
  }, [showToast]);
  
  const showInfo = useCallback((message: string, duration: number = 3000) => {
    showToast(message, 'info', duration);
  }, [showToast]);
  
  const handleDismiss = useCallback(() => {
    setToastConfig(prev => ({ ...prev, visible: false }));
  }, []);
  
  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        duration={toastConfig.duration}
        onDismiss={handleDismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
