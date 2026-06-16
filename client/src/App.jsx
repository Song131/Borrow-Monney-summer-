import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { ToastProvider } from './context/ToastContext';
import RequireAdmin from './routes/RequireAdmin';
import RequireSuperAdmin from './routes/RequireSuperAdmin';
import RequireCustomer from './routes/RequireCustomer';
import AdminLayout from './layouts/AdminLayout';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/admin/DashboardPage';
import CustomersPage from './pages/admin/CustomersPage';
import LoansPage from './pages/admin/LoansPage';
import LoanDetailPage from './pages/admin/LoanDetailPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import ProfilePage from './pages/admin/ProfilePage';
import AdminsPage from './pages/admin/AdminsPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import CustomerLoanDetailPage from './pages/customer/CustomerLoanDetailPage';

export default function App() {
  return (
    <AdminAuthProvider>
      <CustomerAuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/customer/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />

            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/loans" element={<LoansPage />} />
                <Route path="/loans/:id" element={<LoanDetailPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route element={<RequireSuperAdmin />}>
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admins" element={<AdminsPage />} />
                </Route>
              </Route>
            </Route>

            <Route element={<RequireCustomer />}>
              <Route path="/customer" element={<CustomerDashboardPage />} />
              <Route path="/customer/loans/:id" element={<CustomerLoanDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </CustomerAuthProvider>
    </AdminAuthProvider>
  );
}
