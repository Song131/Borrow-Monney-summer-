import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await api('GET', '/api/customer/me');
      setCustomer(data);
      return data;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = useCallback(async (citizenNumber, phone) => {
    const res = await api('POST', '/api/customer/login', { citizenNumber, phone });
    setCustomer(res.customer);
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api('POST', '/api/customer/register', payload);
    setCustomer(res.customer);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await api('POST', '/api/customer/logout');
    setCustomer(null);
  }, []);

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, login, register, logout, refetch }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
