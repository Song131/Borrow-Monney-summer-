import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate } from '../../lib/format';
import Modal from '../../components/Modal';

export default function PaymentsPage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  useEffect(() => setTitle('การชำระเงิน'), [setTitle]);

  const [pending, setPending] = useState([]);
  const [slipViewUrl, setSlipViewUrl] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/payments/pending');
      setPending(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id, action) {
    if (!window.confirm(`ต้องการ${action}รายการชำระนี้?`)) return;
    try {
      const res = await api('PUT', `/api/payments/${id}/approve`, { action });
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="alert alert-info">เมื่ออนุมัติรายการชำระ ระบบจะหักยอดชำระจากสัญญาโดยอัตโนมัติ</div>

      <div className="card">
        <div className="card-title">
          รายการชำระรอตรวจสอบ {pending.length > 0 && <span className="badge badge-wait">{pending.length}</span>}
        </div>
        {pending.length === 0 ? (
          <div className="alert alert-success">ไม่มีรายการรอตรวจสอบ</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>ลูกหนี้</th><th>สัญญา</th><th>ยอดชำระ</th><th>วิธีการ</th><th>วันที่</th><th>สลิป</th><th>จัดการ</th></tr>
              </thead>
              <tbody>
                {pending.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.firstName} {p.lastName}</td>
                    <td><Link to={`/loans/${p.loan_id}`}>#{p.loan_id} ({formatMoney(p.loanAmount)} / {p.rate}% / {p.month} งวด)</Link></td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(p.payAmount)} บาท</td>
                    <td>{p.method || '-'}</td>
                    <td>{formatDate(p.payDate)}</td>
                    <td>{p.cdnurl ? <button className="btn btn-outline btn-sm" onClick={() => setSlipViewUrl(p.cdnurl)}>ดูสลิป</button> : '-'}</td>
                    <td>
                      <button className="btn btn-success btn-sm" onClick={() => approve(p.id, 'อนุมัติ')}>อนุมัติ</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => approve(p.id, 'ปฏิเสธ')}>ปฏิเสธ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!slipViewUrl} onClose={() => setSlipViewUrl(null)}>
        <img src={slipViewUrl} style={{ width: '100%' }} alt="สลิปการชำระเงิน" />
      </Modal>
    </>
  );
}
