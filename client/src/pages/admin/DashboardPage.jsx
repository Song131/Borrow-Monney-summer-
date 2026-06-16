import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate, daysOverdue } from '../../lib/format';

export default function DashboardPage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => setTitle('แดชบอร์ด'), [setTitle]);

  const load = useCallback(async () => {
    try {
      const res = await api('GET', '/api/dashboard');
      setData(res);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function approvePayment(id, action) {
    if (!window.confirm(`ต้องการ${action}รายการชำระนี้?`)) return;
    try {
      const res = await api('PUT', `/api/payments/${id}/approve`, { action });
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!data) return null;
  const s = data.summary;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card info">
          <div className="stat-label">สัญญาที่กำลังดำเนินการ</div>
          <div className="stat-value">{s.activeLoans || 0}</div>
          <div className="stat-sub">สัญญา</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">รอดำเนินการ</div>
          <div className="stat-value">{s.pendingLoans || 0}</div>
          <div className="stat-sub">สัญญา</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">เกินกำหนด</div>
          <div className="stat-value">{s.overdueCount || 0}</div>
          <div className="stat-sub">สัญญา</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">ปิดสัญญาแล้ว</div>
          <div className="stat-value">{s.closedLoans || 0}</div>
          <div className="stat-sub">สัญญา</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ยอดหนี้คงค้างทั้งหมด</div>
          <div className="stat-value">{formatMoney(s.totalOutstanding)}</div>
          <div className="stat-sub">บาท</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">สัญญาเกินกำหนดชำระ</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ลูกหนี้</th><th>วงเงิน</th><th>ครบกำหนด</th><th>เกิน</th></tr>
              </thead>
              <tbody>
                {data.overdue.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>ไม่มีสัญญาเกินกำหนด</td></tr>
                ) : (
                  data.overdue.map((l) => (
                    <tr key={l.id}>
                      <td><Link to={`/loans/${l.id}`}>{l.firstName} {l.lastName}</Link></td>
                      <td>{formatMoney(l.amount)}</td>
                      <td>{formatDate(l.dueDate)}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>{daysOverdue(l.dueDate)} วัน</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">ครบกำหนดใน 30 วัน</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ลูกหนี้</th><th>วงเงิน</th><th>ครบกำหนด</th><th>คงเหลือ</th></tr>
              </thead>
              <tbody>
                {data.upcoming.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>ไม่มีสัญญาใกล้ครบกำหนด</td></tr>
                ) : (
                  data.upcoming.map((l) => {
                    const remaining = parseFloat(l.amount) - parseFloat(l.totalPaid);
                    return (
                      <tr key={l.id}>
                        <td><Link to={`/loans/${l.id}`}>{l.firstName} {l.lastName}</Link></td>
                        <td>{formatMoney(l.amount)}</td>
                        <td>{formatDate(l.dueDate)}</td>
                        <td style={{ color: '#d97706' }}>{formatMoney(remaining)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">รายการชำระรอตรวจสอบ</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ลูกหนี้</th><th>สัญญา #</th><th>ยอดชำระ</th><th>วันที่</th><th>จัดการ</th></tr>
            </thead>
            <tbody>
              {data.pendingPayments.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6b7280' }}>ไม่มีรายการรอตรวจสอบ</td></tr>
              ) : (
                data.pendingPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.firstName} {p.lastName}</td>
                    <td><Link to={`/loans/${p.loanId}`}>#{p.loanId}</Link></td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(p.payAmount)} บาท</td>
                    <td>{formatDate(p.payDate)}</td>
                    <td>
                      <button className="btn btn-success btn-sm" onClick={() => approvePayment(p.id, 'อนุมัติ')}>อนุมัติ</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => approvePayment(p.id, 'ปฏิเสธ')}>ปฏิเสธ</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
