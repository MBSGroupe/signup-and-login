// Context/ModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import GlobalModal from '../Components/Modals/GlobaModal';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'alert' | 'prompt'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    inputValue: '',
    inputPlaceholder: '',
  });

  // Return a promise that resolves with the user's choice
  const confirm = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, []);

  const alert = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => resolve(true),
      });
    });
  }, []);

  const prompt = useCallback(({ title, message, placeholder = '' }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        inputValue: '',
        inputPlaceholder: placeholder,
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback((value) => {
    if (modalState.type === 'prompt') {
      modalState.onConfirm?.(value);
    } else {
      modalState.onConfirm?.();
    }
    closeModal();
  }, [modalState, closeModal]);

  const handleCancel = useCallback(() => {
    modalState.onCancel?.();
    closeModal();
  }, [modalState, closeModal]);

  const setInputValue = useCallback((value) => {
    setModalState(prev => ({ ...prev, inputValue: value }));
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <GlobalModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        inputValue={modalState.inputValue}
        inputPlaceholder={modalState.inputPlaceholder}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onInputChange={setInputValue}
      />
    </ModalContext.Provider>
  );
};