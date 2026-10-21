import React, { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => {
    try {
      return localStorage.getItem('corebank_role') || 'DEVELOPER';
    } catch {
      return 'DEVELOPER';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('corebank_role', role);
    } catch {
      // storage error fallback
    }
  }, [role]);

  const toggleRole = () => {
    setRole((prev) => (prev === 'DEVELOPER' ? 'ADMIN' : 'DEVELOPER'));
  };

  const isAdmin = role === 'ADMIN';

  return (
    <RoleContext.Provider value={{ role, setRole, toggleRole, isAdmin }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
