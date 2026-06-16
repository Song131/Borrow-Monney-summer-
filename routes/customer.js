const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { generateSchedule } = require('./_shared/schedule');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/slips/'),
  filename: (req, file, cb) => cb(null, `slip_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ'));
  }
});

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, citizenNumber, phone, address, occupation, monthlyIncome } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
    if (!citizenNumber || citizenNumber.length !== 13) return res.status(400).json({ error: 'เลขบัตรประชาชนต้องมี 13 หลัก' });
    if (!phone) return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์' });

    const [[{ c }]] = await db.query('SELECT COUNT(*) as c FROM customer WHERE citizenNumber=?', [citizenNumber]);
    if (c > 0) return res.status(400).json({ error: 'เลขบัตรประชาชนนี้มีในระบบแล้ว' });

    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM customer');
    const newId = maxId + 1;
    await db.query(
      'INSERT INTO customer (id,firstName,lastName,phone,address,occupation,monthlyIncome,citizenNumber) VALUES (?,?,?,?,?,?,?,?)',
      [newId, firstName, lastName, phone, address || null, occupation || null, monthlyIncome || null, citizenNumber]
    );
    req.session.customer = { id: newId, name: `${firstName} ${lastName}` };
    res.json({ message: 'สมัครสมาชิกสำเร็จ', customer: req.session.customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { citizenNumber, phone } = req.body;
    if (!citizenNumber || !phone) return res.status(400).json({ error: 'กรุณากรอกเลขบัตรประชาชนและเบอร์โทร' });
    const [rows] = await db.query(
      'SELECT * FROM customer WHERE citizenNumber=? AND phone=?',
      [citizenNumber.trim(), phone.trim()]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'ไม่พบข้อมูล กรุณาตรวจสอบเลขบัตรประชาชนและเบอร์โทรศัพท์' });
    req.session.customer = { id: rows[0].id, name: `${rows[0].firstName} ${rows[0].lastName}` };
    res.json({ message: 'เข้าสู่ระบบสำเร็จ', customer: req.session.customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  delete req.session.customer;
  res.json({ message: 'ออกจากระบบแล้ว' });
});

router.get('/me', (req, res) => {
  if (req.session.customer) res.json(req.session.customer);
  else res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
});

function requireCustomer(req, res, next) {
  if (!req.session.customer) return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
  next();
}

router.get('/loans', requireCustomer, async (req, res) => {
  try {
    const cid = req.session.customer.id;
    const [loans] = await db.query(
      `SELECT l.*,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END),0) as totalPaid
       FROM loan l
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.customer_id=?
       GROUP BY l.id
       ORDER BY l.date DESC`,
      [cid]
    );
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/loans/:id', requireCustomer, async (req, res) => {
  try {
    const cid = req.session.customer.id;
    const [[loan]] = await db.query(
      `SELECT l.*,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END),0) as totalPaid
       FROM loan l
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.id=? AND l.customer_id=?
       GROUP BY l.id`,
      [req.params.id, cid]
    );
    if (!loan) return res.status(404).json({ error: 'ไม่พบสัญญา' });

    const [payments] = await db.query(
      'SELECT * FROM payment WHERE loan_id=? ORDER BY payDate DESC',
      [req.params.id]
    );

    const schedule = generateSchedule(
      parseFloat(loan.amount),
      parseFloat(loan.rate),
      loan.month,
      loan.date
    );

    res.json({ loan, payments, schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request-loan', requireCustomer, async (req, res) => {
  try {
    const cid = req.session.customer.id;
    const { amount, month, purpose, guarantors } = req.body;
    if (!amount || !month) return res.status(400).json({ error: 'กรุณากรอกวงเงินและจำนวนงวด' });
    if (parseFloat(amount) > 50000) return res.status(400).json({ error: 'วงเงินสูงสุดไม่เกิน 50,000 บาท' });

    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM loan');
    const [[admin]] = await db.query('SELECT id FROM Admin LIMIT 1');
    const startDate = new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + parseInt(month));

    const newLoanId = maxId + 1;
    await db.query(
      'INSERT INTO loan (id,date,amount,rate,month,dueDate,purpose,loanStatus,customer_id,Admin_id) VALUES (?,?,?,15,?,?,?,?,?,?)',
      [newLoanId, startDate, parseFloat(amount), month, dueDate, purpose || null, 'pending', cid, admin.id]
    );

    if (guarantors && guarantors.length > 0) {
      const [[{ maxGId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxGId FROM guarantor');
      let gId = maxGId + 1;
      for (const g of guarantors) {
        if (!g.name) continue;
        await db.query(
          'INSERT INTO guarantor (id,loan_id,name,phone,citizenNumber,relationship,loan_id1) VALUES (?,?,?,?,?,?,?)',
          [gId++, newLoanId, g.name, g.phone || null, g.citizenNumber || null, g.relationship || null, newLoanId]
        );
      }
    }

    res.json({ message: 'ยื่นขอกู้เรียบร้อย รอ Admin ตรวจสอบและอนุมัติ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', requireCustomer, async (req, res) => {
  try {
    const [[cust]] = await db.query('SELECT * FROM customer WHERE id=?', [req.session.customer.id]);
    res.json(cust);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loans/:id/pay', requireCustomer, upload.single('slip'), async (req, res) => {
  try {
    const cid = req.session.customer.id;
    const [[loan]] = await db.query(
      'SELECT * FROM loan WHERE id=? AND customer_id=?',
      [req.params.id, cid]
    );
    if (!loan) return res.status(404).json({ error: 'ไม่พบสัญญา' });
    if (loan.loanStatus === 'closed') return res.status(400).json({ error: 'สัญญานี้ปิดแล้ว' });
    if (loan.loanStatus !== 'active') return res.status(400).json({ error: 'สัญญายังไม่ได้รับอนุมัติ' });

    const { payAmount, method } = req.body;
    if (!payAmount) return res.status(400).json({ error: 'กรุณากรอกยอดชำระ' });
    if (!req.file) return res.status(400).json({ error: 'กรุณาแนบสลิปการโอนเงิน' });

    const cdnurl = `/uploads/slips/${req.file.filename}`;
    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM payment');
    const [[admin]] = await db.query('SELECT id FROM Admin LIMIT 1');

    await db.query(
      'INSERT INTO payment (id,loan_id,payDate,payAmount,lateFee,method,cdnurl,stats,Admin_id) VALUES (?,?,NOW(),?,0,?,?,?,?)',
      [maxId + 1, loan.id, parseFloat(payAmount), method || 'โอน', cdnurl, 'รอตรวจ', admin.id]
    );
    res.json({ message: 'ส่งหลักฐานการชำระเรียบร้อย รอ Admin ตรวจสอบ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
