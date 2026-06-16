import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import Logomark from '../components/Logomark';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'แดชบอร์ด' },
  { to: '/customers', icon: '👥', label: 'ลูกหนี้' },
  { to: '/loans', icon: '📋', label: 'สัญญากู้ยืม' },
  { to: '/payments', icon: '💳', label: 'การชำระเงิน' },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/admins', icon: '⚙️', label: 'จัดการแอดมิน' },
  { to: '/profile', icon: '🏦', label: 'ตั้งค่าบัญชี' },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');

  const items = admin?.id === 1 ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Logomark size={26} />
          <div className="sidebar-logo-text">
            <span>MicroLoan</span>
            <small>ระบบกู้ยืมเงินรายย่อย</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">แอดมิน: {admin?.name || '-'}</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>ออกจากระบบ</button>
        </header>
        <div className="content">
          <Outlet context={{ setTitle }} />
        </div>
      </div>
    </div>
  );
}
