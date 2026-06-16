const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/slips/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `slip_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ'));
  }
});

router.get('/pending', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, l.amount as loanAmount, l.rate, l.month,
        c.firstName, c.lastName
       FROM payment p
       JOIN loan l ON p.loan_id = l.id
       JOIN customer c ON l.customer_id = c.id
       WHERE p.stats = 'รอตรวจ'
       ORDER BY p.payDate DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/loan/:loanId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM payment WHERE loan_id = ? ORDER BY payDate DESC',
      [req.params.loanId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('slip'), async (req, res) => {
  try {
    const { loan_id, payAmount, method } = req.body;
    if (!loan_id || !payAmount) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

    const [[loan]] = await db.query('SELECT * FROM loan WHERE id = ?', [loan_id]);
    if (!loan) return res.status(404).json({ error: 'ไม่พบสัญญากู้ยืม' });
    if (loan.loanStatus === 'closed') return res.status(400).json({ error: 'สัญญานี้ปิดแล้ว' });

    const cdnurl = req.file ? `/uploads/slips/${req.file.filename}` : null;

    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM payment');
    const newId = maxId + 1;

    const [[admin]] = await db.query('SELECT id FROM Admin LIMIT 1');
    const adminId = admin ? admin.id : 1;

    await db.query(
      'INSERT INTO payment (id,loan_id,payDate,payAmount,lateFee,method,cdnurl,stats,Admin_id) VALUES (?,?,NOW(),?,?,?,?,?,?)',
      [newId, loan_id, parseFloat(payAmount), 0, method || 'โอน', cdnurl, 'รอตรวจ', adminId]
    );

    res.json({ id: newId, message: 'บันทึกการชำระเงินเรียบร้อย รอ Admin ตรวจสอบ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/approve', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { action } = req.body;
    if (!['อนุมัติ', 'ปฏิเสธ'].includes(action))
      return res.status(400).json({ error: 'action ไม่ถูกต้อง' });

    const [[payment]] = await conn.query('SELECT * FROM payment WHERE id = ?', [req.params.id]);
    if (!payment) return res.status(404).json({ error: 'ไม่พบรายการชำระ' });
    if (payment.stats !== 'รอตรวจ') return res.status(400).json({ error: 'รายการนี้ตรวจสอบแล้ว' });

    await conn.query('UPDATE payment SET stats=? WHERE id=?', [action, req.params.id]);

    if (action === 'อนุมัติ') {
      const [[{ totalPaid }]] = await conn.query(
        `SELECT COALESCE(SUM(payAmount),0) as totalPaid FROM payment WHERE loan_id=? AND stats='อนุมัติ'`,
        [payment.loan_id]
      );
      const [[loan]] = await conn.query('SELECT * FROM loan WHERE id=?', [payment.loan_id]);

      if (parseFloat(totalPaid) >= parseFloat(loan.amount)) {
        await conn.query("UPDATE loan SET loanStatus='closed' WHERE id=?", [payment.loan_id]);
      }
    }

    await conn.commit();
    res.json({ message: `${action}รายการชำระเรียบร้อย` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
