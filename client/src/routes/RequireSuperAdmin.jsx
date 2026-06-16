import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function RequireSuperAdmin() {
  const { admin, loading } = useAdminAuth();
  const context = useOutletContext();
  if (loading) return null;
  if (!admin) return <Navigate to="/login" replace />;
  if (admin.id !== 1) return <Navigate to="/dashboard" replace />;
  return <Outlet context={context} />;
}
