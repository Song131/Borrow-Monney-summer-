const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [[summary]] = await db.query(`
      SELECT
        COUNT(CASE WHEN loanStatus='active' THEN 1 END) as activeLoans,
        COUNT(CASE WHEN loanStatus='pending' THEN 1 END) as pendingLoans,
        COUNT(CASE WHEN loanStatus='closed' THEN 1 END) as closedLoans,
        SUM(CASE WHEN loanStatus='active' THEN amount ELSE 0 END) as totalOutstanding,
        COUNT(CASE WHEN loanStatus='active' AND dueDate < NOW() THEN 1 END) as overdueCount
      FROM loan
    `);

    const [overdue] = await db.query(`
      SELECT l.id, l.amount, l.dueDate, l.rate, l.month,
        c.firstName, c.lastName, c.phone,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END),0) as totalPaid
      FROM loan l
      JOIN customer c ON l.customer_id = c.id
      LEFT JOIN payment p ON l.id = p.loan_id
      WHERE l.loanStatus='active' AND l.dueDate < NOW()
      GROUP BY l.id
      ORDER BY l.dueDate ASC
      LIMIT 10
    `);

    const [upcoming] = await db.query(`
      SELECT l.id, l.amount, l.dueDate, l.rate, l.month,
        c.firstName, c.lastName, c.phone,
        COALESCE(SUM(CASE WHEN p.stats='อนุมัติ' THEN p.payAmount ELSE 0 END),0) as totalPaid
      FROM loan l
      JOIN customer c ON l.customer_id = c.id
      LEFT JOIN payment p ON l.id = p.loan_id
      WHERE l.loanStatus='active'
        AND l.dueDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
      GROUP BY l.id
      ORDER BY l.dueDate ASC
      LIMIT 10
    `);

    const [pendingPayments] = await db.query(`
      SELECT p.id, p.payAmount, p.payDate, p.method,
        c.firstName, c.lastName, l.id as loanId
      FROM payment p
      JOIN loan l ON p.loan_id = l.id
      JOIN customer c ON l.customer_id = c.id
      WHERE p.stats='รอตรวจ'
      ORDER BY p.payDate DESC
      LIMIT 10
    `);

    res.json({ summary, overdue, upcoming, pendingPayments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
