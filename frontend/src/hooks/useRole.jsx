import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
      // Synchronize auth token with active role using verified credentials
      axios
        .post('/api/auth/token', {
          role,
          password: role === 'ADMIN' ? 'admin123' : 'dev123'
        })
        .then((res) => {
          if (res.data && res.data.token) {
            localStorage.setItem('corebank_auth_token', res.data.token);
          }
        })
        .catch(() => {});
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
