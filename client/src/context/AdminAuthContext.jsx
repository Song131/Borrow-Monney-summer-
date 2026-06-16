import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await api('GET', '/api/auth/me');
      setAdmin(data);
      return data;
    } catch {
      setAdmin(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = useCallback(async (username, password) => {
    const res = await api('POST', '/api/auth/login', { username, password });
    setAdmin(res.admin);
    return res;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api('POST', '/api/auth/register', payload);
    setAdmin(res.admin);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await api('POST', '/api/auth/logout');
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, register, logout, refetch }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
