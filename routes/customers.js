const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*,
        COUNT(l.id) as totalLoans,
        SUM(CASE WHEN l.loanStatus='active' THEN l.amount ELSE 0 END) as activeAmount
       FROM customer c
       LEFT JOIN loan l ON c.id = l.customer_id
       GROUP BY c.id
       ORDER BY c.id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customer WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลลูกค้า' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/loans', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM loan WHERE customer_id = ? ORDER BY date DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, phone, address, occupation, monthlyIncome, citizenNumber } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' });
    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM customer');
    const newId = maxId + 1;
    await db.query(
      'INSERT INTO customer (id,firstName,lastName,phone,address,occupation,monthlyIncome,citizenNumber) VALUES (?,?,?,?,?,?,?,?)',
      [newId, firstName, lastName, phone || null, address || null, occupation || null, monthlyIncome || null, citizenNumber || null]
    );
    res.json({ id: newId, message: 'เพิ่มข้อมูลลูกค้าเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, phone, address, occupation, monthlyIncome, citizenNumber } = req.body;
    await db.query(
      'UPDATE customer SET firstName=?,lastName=?,phone=?,address=?,occupation=?,monthlyIncome=?,citizenNumber=? WHERE id=?',
      [firstName, lastName, phone, address, occupation, monthlyIncome, citizenNumber, req.params.id]
    );
    res.json({ message: 'แก้ไขข้อมูลเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
