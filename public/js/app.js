const API = '';

async function api(method, url, data, isForm = false) {
  const opts = { method, credentials: 'include' };
  if (data) {
    if (isForm) opts.body = data;
    else { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(data); }
  }
  const res = await fetch(API + url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'เกิดข้อผิดพลาด');
  return json;
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusBadge(s) {
  const map = {
    active: ['badge-active', 'กำลังดำเนินการ'],
    pending: ['badge-pending', 'รอดำเนินการ'],
    closed: ['badge-closed', 'ปิดสัญญา'],
    rejected: ['badge-rejected', 'ปฏิเสธ'],
    'รอตรวจ': ['badge-wait', 'รอตรวจ'],
    'อนุมัติ': ['badge-approved', 'อนุมัติ'],
    'ปฏิเสธ': ['badge-rejected', 'ปฏิเสธ']
  };
  const [cls, label] = map[s] || ['', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function daysOverdue(dueDate) {
  const diff = new Date() - new Date(dueDate);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function calcPMT(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

async function checkAuth() {
  try {
    const admin = await api('GET', '/api/auth/me');
    const el = document.getElementById('admin-name');
    if (el) el.textContent = admin.name || admin.username;
    // เพิ่มเมนู Super Admin เฉพาะ id=1
    if (admin.id === 1) {
      const nav = document.querySelector('.sidebar-nav');
      if (nav && !nav.querySelector('[href="/admins.html"]')) {
        const link = document.createElement('a');
        link.href = '/admins.html';
        link.className = 'nav-item';
        link.innerHTML = '<span class="icon">⚙️</span><span>จัดการแอดมิน</span>';
        if (window.location.pathname === '/admins.html') link.classList.add('active');
        nav.appendChild(link);

        const bankLink = document.createElement('a');
        bankLink.href = '/profile.html';
        bankLink.className = 'nav-item';
        bankLink.innerHTML = '<span class="icon">🏦</span><span>ตั้งค่าบัญชี</span>';
        if (window.location.pathname === '/profile.html') bankLink.classList.add('active');
        nav.appendChild(bankLink);
      }
    }
    return admin;
  } catch {
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('setup')) {
      window.location.href = '/login.html';
    }
    return null;
  }
}

function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
    else a.classList.remove('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await api('POST', '/api/auth/logout');
      window.location.href = '/login.html';
    });
  }
});
