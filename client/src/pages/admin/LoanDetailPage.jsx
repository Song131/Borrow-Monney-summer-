import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import Modal from '../../components/Modal';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function LoanDetailPage() {
  const { setTitle } = useOutletContext();
  const { id } = useParams();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('โอน');
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [slipViewUrl, setSlipViewUrl] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', `/api/loans/${id}`);
      setDetail(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setTitle(detail ? `📋 สัญญา #${detail.loan.id}` : '📋 สัญญา');
  }, [setTitle, detail]);

  const progress = useMemo(() => {
    if (!detail) return null;
    const amount = parseFloat(detail.loan.amount);
    const paid = parseFloat(detail.loan.totalPaid);
    const remaining = Math.max(0, amount - paid);
    const pct = Math.min(100, (paid / amount) * 100);
    return { amount, paid, remaining, pct };
  }, [detail]);

  const scheduleRows = useMemo(() => {
    if (!detail) return [];
    let cumPaid = parseFloat(detail.loan.totalPaid);
    const now = new Date();
    const soon = new Date(now.getTime() + SEVEN_DAYS_MS);
    return detail.schedule.map((s) => {
      let status, cls;
      if (cumPaid >= s.payment) {
        status = '✅ ชำระแล้ว';
        cls = 'row-paid';
        cumPaid -= s.payment;
      } else if (new Date(s.dueDate) < now) {
        status = '⚠️ เกินกำหนด';
        cls = 'row-overdue';
      } else if (new Date(s.dueDate) <= soon) {
        status = '🔔 ใกล้ครบกำหนด';
        cls = 'row-near';
      } else {
        status = 'รอชำระ';
        cls = '';
      }
      return { ...s, status, cls };
    });
  }, [detail]);

  async function setStatus(status) {
    const confirmText = {
      active: 'ต้องการอนุมัติสัญญานี้?',
      rejected: 'ต้องการปฏิเสธสัญญานี้?',
      closed: 'ต้องการปิดสัญญานี้?',
    };
    if (!window.confirm(confirmText[status] || 'ยืนยัน?')) return;
    try {
      const res = await api('PUT', `/api/loans/${id}/status`, { status });
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function approvePayment(paymentId, action) {
    if (!window.confirm(`ต้องการ${action}รายการชำระนี้?`)) return;
    try {
      const res = await api('PUT', `/api/payments/${paymentId}/approve`, { action });
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openPaymentModal() {
    setPayAmount('');
    setPayMethod('โอน');
    setSlipFile(null);
    setSlipPreview(null);
    setPayModalOpen(true);
  }

  function handleSlipChange(e) {
    const file = e.target.files[0];
    setSlipFile(file || null);
    if (!file) {
      setSlipPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function submitPayment() {
    if (!payAmount) return toast('กรุณากรอกยอดชำระ', 'error');
    const fd = new FormData();
    fd.append('loan_id', id);
    fd.append('payAmount', payAmount);
    fd.append('method', payMethod);
    if (slipFile) fd.append('slip', slipFile);
    try {
      const res = await api('POST', '/api/payments', fd, true);
      toast(res.message, 'success');
      setPayModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!detail) return null;
  const { loan, guarantors, payments } = detail;
  const pmt = scheduleRows.length > 0 ? scheduleRows[0].payment : 0;
  const overdue = loan.loanStatus === 'active' && new Date(loan.dueDate) < new Date();

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          <div className="card">
            <div className="card-title">ข้อมูลสัญญา <StatusBadge status={loan.loanStatus} /></div>
            <div className="info-row"><span className="lbl">วงเงินกู้</span><span className="val">{formatMoney(loan.amount)} บาท</span></div>
            <div className="info-row"><span className="lbl">อัตราดอกเบี้ย</span><span className="val">{loan.rate}% ต่อปี</span></div>
            <div className="info-row"><span className="lbl">จำนวนงวด</span><span className="val">{loan.month} เดือน</span></div>
            <div className="info-row"><span className="lbl">ค่างวด/เดือน</span><span className="val">{formatMoney(pmt)} บาท</span></div>
            <div className="info-row"><span className="lbl">วันที่ทำสัญญา</span><span className="val">{formatDate(loan.date)}</span></div>
            <div className="info-row">
              <span className="lbl">วันครบกำหนด</span>
              <span className="val" style={{ color: overdue ? '#dc2626' : 'inherit' }}>{formatDate(loan.dueDate)}</span>
            </div>
            <div className="info-row"><span className="lbl">วัตถุประสงค์</span><span className="val">{loan.purpose || '-'}</span></div>
          </div>

          <div className="card">
            <div className="card-title">ข้อมูลลูกหนี้</div>
            <div className="info-row"><span className="lbl">ชื่อ-นามสกุล</span><span className="val">{loan.firstName} {loan.lastName}</span></div>
            <div className="info-row"><span className="lbl">เบอร์โทร</span><span className="val">{loan.phone || '-'}</span></div>
            <div className="info-row"><span className="lbl">เลขบัตรประชาชน</span><span className="val">{loan.citizenNumber || '-'}</span></div>
            <div className="info-row"><span className="lbl">อาชีพ</span><span className="val">{loan.occupation || '-'}</span></div>
            <div className="info-row"><span className="lbl">รายได้/เดือน</span><span className="val">{loan.monthlyIncome ? formatMoney(loan.monthlyIncome) : '-'}</span></div>
            <div className="info-row"><span className="lbl">ที่อยู่</span><span className="val">{loan.address || '-'}</span></div>
          </div>

          {guarantors.length > 0 && (
            <div className="card">
              <div className="card-title">ผู้ค้ำประกัน</div>
              {guarantors.map((g) => (
                <div key={g.id} className="info-row">
                  <span className="lbl">{g.name} ({g.relationship || '-'})</span>
                  <span className="val">{g.phone || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <div className="card-title">ความคืบหน้า</div>
            <ProgressBar percent={progress.pct} variant={progress.remaining === 0 ? 'success' : undefined} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
              <span>ชำระแล้ว {formatMoney(progress.paid)}</span>
              <span>คงเหลือ {formatMoney(progress.remaining)}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">การจัดการ</div>
            {loan.loanStatus === 'pending' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-success" onClick={() => setStatus('active')}>✅ อนุมัติ</button>
                <button className="btn btn-danger" onClick={() => setStatus('rejected')}>❌ ปฏิเสธ</button>
              </div>
            )}
            {loan.loanStatus === 'active' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary" onClick={openPaymentModal}>💳 บันทึกการชำระเงิน</button>
                <button className="btn btn-outline" onClick={() => setStatus('closed')}>ปิดสัญญา</button>
              </div>
            )}
            {loan.loanStatus === 'closed' && <div className="alert alert-success">✅ ปิดสัญญาแล้ว</div>}
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 10, width: '100%' }}
              onClick={() => window.open(`/api/loans/${id}/contract`, '_blank')}
            >
              🖨️ สัญญา PDF
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">ตารางผ่อนชำระ</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>งวดที่</th><th>ครบกำหนด</th><th>ค่างวด</th><th>เงินต้น</th><th>ดอกเบี้ย</th><th>คงเหลือ</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
              {scheduleRows.map((s) => (
                <tr key={s.installment} className={s.cls}>
                  <td>{s.installment}</td>
                  <td>{s.dueDate}</td>
                  <td>{formatMoney(s.payment)}</td>
                  <td>{formatMoney(s.principal)}</td>
                  <td>{formatMoney(s.interest)}</td>
                  <td>{formatMoney(s.balance)}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">ประวัติการชำระ</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>วันที่</th><th>ยอดชำระ</th><th>วิธีการ</th><th>สลิป</th><th>สถานะ</th><th>จัดการ</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>ยังไม่มีประวัติการชำระ</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.payDate)}</td>
                    <td>{formatMoney(p.payAmount)}</td>
                    <td>{p.method || '-'}</td>
                    <td>{p.cdnurl ? <button className="btn btn-outline btn-sm" onClick={() => setSlipViewUrl(p.cdnurl)}>ดูสลิป</button> : '-'}</td>
                    <td><StatusBadge status={p.stats} /></td>
                    <td>
                      {p.stats === 'รอตรวจ' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => approvePayment(p.id, 'อนุมัติ')}>อนุมัติ</button>{' '}
                          <button className="btn btn-danger btn-sm" onClick={() => approvePayment(p.id, 'ปฏิเสธ')}>ปฏิเสธ</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)}>
        <div className="modal-title">บันทึกการชำระเงิน</div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>ยอดชำระ (บาท) *</label>
          <input type="number" min="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>วิธีการชำระ</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <option value="โอน">โอนเงิน</option>
            <option value="เงินสด">เงินสด</option>
            <option value="QR Code">QR Code</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label>สลิปการโอน</label>
          <input type="file" accept="image/*" onChange={handleSlipChange} />
          {slipPreview && <img src={slipPreview} className="slip-preview" alt="ตัวอย่างสลิป" />}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setPayModalOpen(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={submitPayment}>บันทึก</button>
        </div>
      </Modal>

      <Modal open={!!slipViewUrl} onClose={() => setSlipViewUrl(null)}>
        <img src={slipViewUrl} style={{ width: '100%' }} alt="สลิปการชำระเงิน" />
      </Modal>
    </>
  );
}
