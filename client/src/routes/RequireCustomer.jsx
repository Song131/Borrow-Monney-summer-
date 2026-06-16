import { Navigate, Outlet } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function RequireCustomer() {
  const { customer, loading } = useCustomerAuth();
  if (loading) return null;
  if (!customer) return <Navigate to="/customer/login" replace />;
  return <Outlet />;
}
