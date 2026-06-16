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
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/login.html'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'microloan_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/customer', require('./routes/customer'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ ระบบกู้ยืมเงินรายย่อยพร้อมใช้งาน`);
  console.log(`🌐 เปิดเบราว์เซอร์ที่: http://localhost:${PORT}`);
  console.log(`📌 ครั้งแรกให้ตั้งค่าแอดมินที่: http://localhost:${PORT}/setup.html\n`);
});
