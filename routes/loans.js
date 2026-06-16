const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateSchedule } = require('./_shared/schedule');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*,
        c.firstName, c.lastName, c.phone,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END), 0) as totalPaid
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.id
       LEFT JOIN payment p ON l.id = p.loan_id
       GROUP BY l.id
       ORDER BY l.date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overdue', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, c.firstName, c.lastName, c.phone,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END), 0) as totalPaid
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.id
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.loanStatus = 'active' AND l.dueDate < NOW()
       GROUP BY l.id
       ORDER BY l.dueDate ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, c.firstName, c.lastName, c.phone,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END), 0) as totalPaid
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.id
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.loanStatus = 'active'
         AND l.dueDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
       GROUP BY l.id
       ORDER BY l.dueDate ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [[loan]] = await db.query(
      `SELECT l.*, c.firstName, c.lastName, c.phone, c.address, c.citizenNumber, c.occupation, c.monthlyIncome,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END), 0) as totalPaid
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.id
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [req.params.id]
    );
    if (!loan) return res.status(404).json({ error: 'ไม่พบข้อมูลสัญญา' });

    const [guarantors] = await db.query(
      'SELECT * FROM guarantor WHERE loan_id1 = ?',
      [req.params.id]
    );

    const [payments] = await db.query(
      'SELECT * FROM payment WHERE loan_id = ? ORDER BY payDate DESC',
      [req.params.id]
    );

    const schedule = generateSchedule(
      parseFloat(loan.amount),
      parseFloat(loan.rate),
      loan.month,
      loan.date
    );

    res.json({ loan, guarantors, payments, schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/contract', async (req, res) => {
  try {
    const [[loan]] = await db.query(
      `SELECT l.*, c.firstName, c.lastName, c.phone, c.address, c.citizenNumber, c.occupation, c.monthlyIncome,
        a.First_Name as adminFirst, a.Last_Name as adminLast,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END), 0) as totalPaid
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.id
       LEFT JOIN Admin a ON l.Admin_id = a.id
       LEFT JOIN payment p ON l.id = p.loan_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [req.params.id]
    );
    const [[bankInfo]] = await db.query(
      'SELECT bankName, bankAccount, bankAccountName, promptpayId FROM Admin WHERE id=1'
    );
    if (!loan) return res.status(404).send('ไม่พบข้อมูล');

    const [guarantors] = await db.query(
      'SELECT * FROM guarantor WHERE loan_id1 = ?',
      [req.params.id]
    );

    const schedule = generateSchedule(
      parseFloat(loan.amount),
      parseFloat(loan.rate),
      loan.month,
      loan.date
    );

    const loanDate = new Date(loan.date);
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const thaiDate = `${loanDate.getDate()} ${thaiMonths[loanDate.getMonth()]} ${loanDate.getFullYear() + 543}`;

    const pmt = schedule.length > 0 ? schedule[0].payment : 0;

    const scheduleRows = schedule.map(s => `
      <tr>
        <td style="text-align:center">${s.installment}</td>
        <td style="text-align:center">${s.dueDate}</td>
        <td style="text-align:right">${s.payment.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
        <td style="text-align:right">${s.principal.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
        <td style="text-align:right">${s.interest.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
        <td style="text-align:right">${s.balance.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
      </tr>`).join('');

    const guarantorSection = guarantors.length > 0 ? guarantors.map(g => `
      <p>ผู้ค้ำประกันที่ ${g.id}: <strong>${g.name}</strong> เลขบัตรประชาชน ${g.citizenNumber || '-'}
      โทร ${g.phone || '-'} ความสัมพันธ์: ${g.relationship || '-'}</p>`).join('') : '<p>-</p>';

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>สัญญากู้ยืมเงิน เลขที่ ${loan.id}</title>
  <style>
    @media print { .no-print { display: none; } }
    body { font-family: 'Sarabun', 'TH Sarabun New', Arial, sans-serif; font-size: 15px; margin: 40px; color: #000; }
    h2 { text-align: center; font-size: 22px; margin-bottom: 5px; }
    .subtitle { text-align: center; font-size: 16px; margin-bottom: 25px; }
    .section { margin: 15px 0; }
    .line { border-bottom: 1px dashed #aaa; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #999; padding: 5px 8px; }
    th { background: #f0f0f0; text-align: center; }
    .sig-box { display: flex; justify-content: space-between; margin-top: 50px; }
    .sig { text-align: center; width: 200px; }
    .sig .line-sig { border-bottom: 1px solid #000; margin: 40px 10px 5px; }
    .btn-print { background:#2563eb; color:#fff; border:none; padding:10px 25px; border-radius:6px; cursor:pointer; font-size:15px; margin-bottom:20px; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center">
    <button class="btn-print" onclick="window.print()">พิมพ์ / บันทึก PDF</button>
  </div>

  <h2>สัญญากู้ยืมเงิน</h2>
  <div class="subtitle">เลขที่สัญญา: <strong>${loan.id}</strong></div>

  <div class="section">
    <p>ทำที่: _______________________________ วันที่ <strong>${thaiDate}</strong></p>
  </div>

  <div class="section">
    <p><strong>ผู้ให้กู้:</strong> ${loan.adminFirst || ''} ${loan.adminLast || ''}</p>
    ${bankInfo && bankInfo.bankAccount ? `
    <table style="width:auto;border:none;margin-top:6px;font-size:14px">
      <tr><td style="border:none;padding:2px 12px 2px 0;color:#555">ธนาคาร</td><td style="border:none;padding:2px 0;font-weight:600">${bankInfo.bankName || '-'}</td></tr>
      <tr><td style="border:none;padding:2px 12px 2px 0;color:#555">เลขบัญชี</td><td style="border:none;padding:2px 0;font-weight:600">${bankInfo.bankAccount}</td></tr>
      <tr><td style="border:none;padding:2px 12px 2px 0;color:#555">ชื่อบัญชี</td><td style="border:none;padding:2px 0;font-weight:600">${bankInfo.bankAccountName || '-'}</td></tr>
      ${bankInfo.promptpayId ? `<tr><td style="border:none;padding:2px 12px 2px 0;color:#555">พร้อมเพย์</td><td style="border:none;padding:2px 0;font-weight:600">${bankInfo.promptpayId}</td></tr>` : ''}
    </table>` : ''}
  </div>

  <div class="section">
    <p><strong>ผู้กู้:</strong> ${loan.firstName} ${loan.lastName}</p>
    <p>เลขบัตรประชาชน: ${loan.citizenNumber || '-'} &nbsp;&nbsp; โทร: ${loan.phone || '-'}</p>
    <p>ที่อยู่: ${loan.address || '-'}</p>
    <p>อาชีพ: ${loan.occupation || '-'} &nbsp;&nbsp; รายได้ต่อเดือน: ${loan.monthlyIncome ? Number(loan.monthlyIncome).toLocaleString('th-TH') + ' บาท' : '-'}</p>
  </div>

  <div class="line"></div>

  <div class="section">
    <p>ข้าพเจ้าผู้กู้ได้กู้ยืมเงินจากผู้ให้กู้เป็นจำนวน <strong>${Number(loan.amount).toLocaleString('th-TH', {minimumFractionDigits:2})} บาท (${numberToThaiText(loan.amount)} บาทถ้วน)</strong></p>
    <p>อัตราดอกเบี้ย: <strong>${loan.rate}% ต่อปี</strong> (ไม่เกิน 15% ต่อปีตามกฎหมาย)</p>
    <p>ระยะเวลา: <strong>${loan.month} เดือน</strong></p>
    <p>ชำระรายเดือน: <strong>${pmt.toLocaleString('th-TH', {minimumFractionDigits:2})} บาท/เดือน</strong></p>
    <p>วัตถุประสงค์: ${loan.purpose || '-'}</p>
    <p>ครบกำหนดชำระ: ${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('th-TH', {year:'numeric',month:'long',day:'numeric'}) : '-'}</p>
  </div>

  <div class="section">
    <p><strong>ผู้ค้ำประกัน:</strong></p>
    ${guarantorSection}
  </div>

  <div class="line"></div>

  <p><strong>ตารางผ่อนชำระ (ลดต้นลดดอก)</strong></p>
  <table>
    <thead>
      <tr>
        <th>งวดที่</th>
        <th>วันครบกำหนด</th>
        <th>ค่างวด (บาท)</th>
        <th>เงินต้น (บาท)</th>
        <th>ดอกเบี้ย (บาท)</th>
        <th>คงเหลือ (บาท)</th>
      </tr>
    </thead>
    <tbody>${scheduleRows}</tbody>
  </table>

  <div class="section" style="margin-top:20px">
    <p><strong>ข้อตกลง:</strong></p>
    <p>1. ผู้กู้ยินยอมชำระดอกเบี้ยในอัตรา ${loan.rate}% ต่อปี ในลักษณะลดต้นลดดอก</p>
    <p>2. หากผู้กู้ผิดนัดชำระ ยินยอมให้คิดดอกเบี้ยผิดนัดในอัตราสูงสุดที่กฎหมายกำหนด</p>
    <p>3. สัญญาฉบับนี้ทำขึ้น 2 ฉบับ มีข้อความตรงกัน ผู้ให้กู้และผู้กู้ถือไว้ฝ่ายละ 1 ฉบับ</p>
  </div>

  <div class="sig-box">
    <div class="sig">
      <div class="line-sig"></div>
      <div>ผู้ให้กู้</div>
      <div style="margin-top:5px">(${loan.adminFirst || '...'} ${loan.adminLast || '...'})</div>
    </div>
    <div class="sig">
      <div class="line-sig"></div>
      <div>ผู้กู้</div>
      <div style="margin-top:5px">(${loan.firstName} ${loan.lastName})</div>
    </div>
    <div class="sig">
      <div class="line-sig"></div>
      <div>ผู้ค้ำประกัน</div>
      <div style="margin-top:5px">(${guarantors.length > 0 ? guarantors[0].name : '...'})</div>
    </div>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    res.status(500).send('เกิดข้อผิดพลาด: ' + err.message);
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, amount, rate, month, purpose, guarantors } = req.body;
    if (!customer_id || !amount || !month)
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

    const loanAmount = parseFloat(amount);
    if (loanAmount > 50000)
      return res.status(400).json({ error: 'วงเงินกู้ต้องไม่เกิน 50,000 บาท' });

    const loanRate = parseFloat(rate) || 15;
    if (loanRate > 15)
      return res.status(400).json({ error: 'อัตราดอกเบี้ยสูงสุดไม่เกิน 15% ต่อปี' });

    const startDate = new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + parseInt(month));

    const [[{ maxId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxId FROM loan');
    const newId = maxId + 1;

    const [[admin]] = await db.query('SELECT id FROM Admin LIMIT 1');
    const adminId = admin ? admin.id : 1;

    await db.query(
      'INSERT INTO loan (id,date,amount,rate,month,dueDate,purpose,loanStatus,customer_id,Admin_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [newId, startDate, loanAmount, loanRate, month, dueDate, purpose || null, 'pending', customer_id, adminId]
    );

    if (guarantors && guarantors.length > 0) {
      const [[{ maxGId }]] = await db.query('SELECT COALESCE(MAX(id),0) as maxGId FROM guarantor');
      let gId = maxGId + 1;
      for (const g of guarantors) {
        await db.query(
          'INSERT INTO guarantor (id,loan_id,name,phone,citizenNumber,relationship,loan_id1) VALUES (?,?,?,?,?,?,?)',
          [gId++, newId, g.name, g.phone || null, g.citizenNumber || null, g.relationship || null, newId]
        );
      }
    }

    res.json({ id: newId, message: 'สร้างสัญญากู้ยืมเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'active', 'closed', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    await db.query('UPDATE loan SET loanStatus=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'อัปเดตสถานะเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function numberToThaiText(num) {
  const n = Math.round(parseFloat(num));
  const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  if (n === 0) return 'ศูนย์';
  const digits = String(n).split('').reverse();
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i]);
    if (d === 0) continue;
    if (i === 1 && d === 1) { result = 'สิบ' + result; continue; }
    if (i === 1 && d === 2) { result = 'ยี่สิบ' + result; continue; }
    result = units[d] + places[i] + result;
  }
  return result;
}

module.exports = router;
