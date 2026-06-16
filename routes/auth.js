const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query(
      'SELECT * FROM Admin WHERE username=? AND password=?',
      [username, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    req.session.admin = { id: rows[0].id, username: rows[0].username, name: `${rows[0].First_Name} ${rows[0].Last_Name}` };
    res.json({ message: 'เข้าสู่ระบบสำเร็จ', admin: req.session.admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'ออกจากระบบแล้ว' });
});

router.get('/me', (req, res) => {
  if (req.session.admin) res.json(req.session.admin);
  else res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    const [[{ c }]] = await db.query('SELECT COUNT(*) as c FROM Admin WHERE username=?', [username]);
    if (c > 0) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM Admin');
    const newId = maxId + 1;
    await db.query(
      'INSERT INTO Admin (id,username,password,email,First_Name,Last_Name) VALUES (?,?,?,?,?,?)',
      [newId, username, password, email || '', firstName || '', lastName || '']
    );
    req.session.admin = { id: newId, username, name: `${firstName || ''} ${lastName || ''}`.trim() || username };
    res.json({ message: 'สมัครสมาชิกสำเร็จ', admin: req.session.admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT COUNT(*) as c FROM Admin');
    if (existing[0].c > 0) return res.status(400).json({ error: 'มีแอดมินแล้ว' });
    const { username, password, email, firstName, lastName } = req.body;
    await db.query(
      'INSERT INTO Admin (id,username,password,email,First_Name,Last_Name) VALUES (1,?,?,?,?,?)',
      [username, password, email || '', firstName || '', lastName || '']
    );
    res.json({ message: 'สร้างบัญชีแอดมินเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function isSuperAdmin(req, res) {
  if (!req.session.admin) { res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' }); return false; }
  if (req.session.admin.id !== 1) { res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' }); return false; }
  return true;
}

router.get('/admins', async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const [rows] = await db.query('SELECT id, username, email, First_Name, Last_Name FROM Admin ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admins', async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const { username, password, email, firstName, lastName } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    const [[{ c }]] = await db.query('SELECT COUNT(*) as c FROM Admin WHERE username=?', [username]);
    if (c > 0) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM Admin');
    await db.query(
      'INSERT INTO Admin (id,username,password,email,First_Name,Last_Name) VALUES (?,?,?,?,?,?)',
      [maxId + 1, username, password, email || '', firstName || '', lastName || '']
    );
    res.json({ message: 'เพิ่มแอดมินเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admins/:id', async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  if (parseInt(req.params.id) === req.session.admin.id) return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  try {
    await db.query('DELETE FROM Admin WHERE id=?', [req.params.id]);
    res.json({ message: 'ลบแอดมินเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admins/:id/password', async (req, res) => {
  if (!isSuperAdmin(req, res)) return;
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านใหม่' });
    await db.query('UPDATE Admin SET password=? WHERE id=?', [password, req.params.id]);
    res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-profile', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
  if (req.session.admin.id !== 1) return res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' });
  try {
    const [[admin]] = await db.query(
      'SELECT id, username, First_Name, Last_Name, email FROM Admin WHERE id=1'
    );
    res.json(admin);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/my-profile', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
  if (req.session.admin.id !== 1) return res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' });
  try {
    const { firstName, lastName, email, newPassword, currentPassword } = req.body;
    const [[admin]] = await db.query('SELECT password FROM Admin WHERE id=1');
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
      if (admin.password !== currentPassword) return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }
    await db.query(
      `UPDATE Admin SET First_Name=?, Last_Name=?, email=?${newPassword ? ', password=?' : ''} WHERE id=1`,
      newPassword
        ? [firstName || '', lastName || '', email || '', newPassword]
        : [firstName || '', lastName || '', email || '']
    );
    req.session.admin.name = `${firstName || ''} ${lastName || ''}`.trim() || req.session.admin.username;
    res.json({ message: 'บันทึกข้อมูลเรียบร้อย' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/bank-info', async (req, res) => {
  try {
    const [[admin]] = await db.query(
      'SELECT bankName, bankAccount, bankAccountName, promptpayId FROM Admin WHERE id=1'
    );
    res.json(admin || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bank-info', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ error: 'ยังไม่ได้เข้าสู่ระบบ' });
  if (req.session.admin.id !== 1) return res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' });
  try {
    const { bankName, bankAccount, bankAccountName, promptpayId } = req.body;
    await db.query(
      'UPDATE Admin SET bankName=?, bankAccount=?, bankAccountName=?, promptpayId=? WHERE id=1',
      [bankName || null, bankAccount || null, bankAccountName || null, promptpayId || null]
    );
    res.json({ message: 'บันทึกข้อมูลบัญชีธนาคารเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
