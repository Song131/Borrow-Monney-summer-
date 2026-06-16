import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import Logomark from '../components/Logomark';

export default function HomePage() {
  const navigate = useNavigate();
  const adminAuth = useAdminAuth();
  const customerAuth = useCustomerAuth();

  useEffect(() => {
    if (!adminAuth.loading && adminAuth.admin) navigate('/dashboard', { replace: true });
  }, [adminAuth.loading, adminAuth.admin, navigate]);

  useEffect(() => {
    if (!customerAuth.loading && customerAuth.customer) navigate('/customer', { replace: true });
  }, [customerAuth.loading, customerAuth.customer, navigate]);

  return (
    <div className="home-page">
      <div className="home-wrap">
        <div className="home-logo"><Logomark size={56} /></div>
        <div className="home-title">ระบบกู้ยืมเงินรายย่อย</div>
        <div className="home-sub">Micro Loan Management System | ดอกเบี้ยไม่เกิน 15% ต่อปี</div>

        <div className="role-cards">
          <Link to="/login" className="role-card">
            <div className="icon">👔</div>
            <div className="role-name">Admin / Staff</div>
            <div className="role-desc">จัดการลูกหนี้ สัญญา และอนุมัติการชำระเงิน</div>
          </Link>
          <Link to="/customer/login" className="role-card">
            <div className="icon">👤</div>
            <div className="role-name">ลูกหนี้</div>
            <div className="role-desc">ตรวจสอบสัญญาและแนบสลิปชำระเงิน</div>
          </Link>
        </div>

        <div className="home-footer">ระบบกู้ยืมเงินรายย่อย v1.0 | บุคคลทั่วไป ตาม ป.พ.พ. มาตรา 654</div>
      </div>
    </div>
  );
}
