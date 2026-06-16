const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Legacy *.html bookmarks from the pre-React static pages -> new SPA routes.
const LEGACY_REDIRECTS = {
  '/login.html': '/login',
  '/customer-login.html': '/customer/login',
  '/setup.html': '/setup',
  '/home.html': '/home',
  '/index.html': '/dashboard',
  '/customers.html': '/customers',
  '/loans.html': '/loans',
  '/payments.html': '/payments',
  '/profile.html': '/profile',
  '/admins.html': '/admins',
  '/customer/index.html': '/customer',
};
app.get(Object.keys(LEGACY_REDIRECTS), (req, res) => res.redirect(301, LEGACY_REDIRECTS[req.path]));
app.get('/loan-detail.html', (req, res) => res.redirect(301, req.query.id ? `/loans/${req.query.id}` : '/loans'));
app.get('/customer/loan.html', (req, res) => res.redirect(301, req.query.id ? `/customer/loans/${req.query.id}` : '/customer'));

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/login'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'microloan_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, sameSite: 'lax' }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/customer', require('./routes/customer'));

// SPA fallback: any other GET request gets the React app shell so client-side
// routing (React Router) resolves it. Path-less middleware avoids Express 5's
// path-to-regexp wildcard syntax change entirely.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ ระบบกู้ยืมเงินรายย่อยพร้อมใช้งาน`);
  console.log(`🌐 เปิดเบราว์เซอร์ที่: http://localhost:${PORT}`);
  console.log(`📌 ครั้งแรกให้ตั้งค่าแอดมินที่: http://localhost:${PORT}/setup\n`);
});
