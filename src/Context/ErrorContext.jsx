import React, { createContext, useContext, useState, useCallback } from 'react';
import MessagePopup from '../Components/Popus/ErrorPopus'
const ErrorContext = createContext(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useError must be used within ErrorProvider');
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);

  const showMessage = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setMessages(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
      }, duration);
    }
  }, []);

  const showError = useCallback((message, duration = 5000) => {
    showMessage(message, 'error', duration);
  }, [showMessage]);

  const showWarning = useCallback((message, duration = 5000) => {
    showMessage(message, 'warning', duration);
  }, [showMessage]);

  const showSuccess = useCallback((message, duration = 3000) => {
    showMessage(message, 'success', duration);
  }, [showMessage]);

  const showInfo = useCallback((message, duration = 4000) => {
    showMessage(message, 'info', duration);
  }, [showMessage]);

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ 
      messages, 
      showError, 
      showWarning, 
      showSuccess, 
      showInfo,
      removeMessage, 
      clearMessages 
    }}>
    <MessagePopup /> 
      {children}
    </ErrorContext.Provider>
  );
};