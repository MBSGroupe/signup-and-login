import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import MessagePopup from '../Components/Popus/ErrorPopus';

const ErrorContext = createContext(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useError must be used within ErrorProvider');
  return context;
};

export const ErrorProvider = ({ children }) => {
  // Single message at a time. New calls replace the current one.
  const [message, setMessage] = useState(null);
  const timeoutRef = useRef(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showMessage = useCallback((text, type = 'error', duration = 5000) => {
    clearTimer();

    // Same text + same type currently showing? Do nothing. Prevents a burst
    // of identical calls (e.g. parallel fetches failing) from flashing.
    setMessage((prev) => {
      if (prev && prev.message === text && prev.type === type) {
        return prev;
      }
      return { id: Date.now().toString(), message: text, type, duration };
    });

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
        timeoutRef.current = null;
      }, duration);
    }
  }, []);

  const showError = useCallback((text, duration = 5000) => {
    showMessage(text, 'error', duration);
  }, [showMessage]);

  const showWarning = useCallback((text, duration = 5000) => {
    showMessage(text, 'warning', duration);
  }, [showMessage]);

  const showSuccess = useCallback((text, duration = 3000) => {
    showMessage(text, 'success', duration);
  }, [showMessage]);

  const showInfo = useCallback((text, duration = 4000) => {
    showMessage(text, 'info', duration);
  }, [showMessage]);

  const removeMessage = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, []);

  const clearMessages = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  // Expose `messages` as an array (single-element or empty) so existing
  // consumers that read `messages` still work without a rewrite.
  const messages = message ? [message] : [];

  return (
    <ErrorContext.Provider value={{
      messages,
      showError,
      showWarning,
      showSuccess,
      showInfo,
      removeMessage,
      clearMessages,
    }}>
      <MessagePopup />
      {children}
    </ErrorContext.Provider>
  );
};