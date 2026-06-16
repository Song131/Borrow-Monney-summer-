import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate } from '../../lib/format';
import { calcPMT } from '../../lib/loan';
import Modal from '../../components/Modal';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STATUS_LABELS = { active: '🟢 กำลังดำเนินการ', pending: '🟡 รอดำเนินการ', closed: '✅ ปิดสัญญา', rejected: '🔴 ปฏิเสธ' };
const PAY_STATUS_CLASS = { 'อนุมัติ': 'st-approve', 'รอตรวจ': 'st-wait', 'ปฏิเสธ': 'st-reject' };
const PAY_STATUS_ICON = { 'อนุมัติ': '✅', 'รอตรวจ': '⏳', 'ปฏิเสธ': '❌' };

export default function CustomerLoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('โอน');
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', `/api/customer/loans/${id}`);
      setDetail(data);
    } catch (err) {
      if (err.message.includes('ยังไม่ได้')) navigate('/login');
      else toast(err.message, 'error');
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    if (!id) {
      navigate('/customer');
      return;
    }
    load();
  }, [id, load, navigate]);

  const computed = useMemo(() => {
    if (!detail) return null;
    const amount = parseFloat(detail.loan.amount);
    const paid = parseFloat(detail.loan.totalPaid);
    const remain = Math.max(0, amount - paid);
    const pct = Math.min(100, (paid / amount) * 100);
    const pmt = calcPMT(amount, parseFloat(detail.loan.rate), detail.loan.month);
    const overdue = detail.loan.loanStatus === 'active' && new Date(detail.loan.dueDate) < new Date();
    return { amount, paid, remain, pct, pmt, overdue };
  }, [detail]);

  const scheduleRows = useMemo(() => {
    if (!detail) return [];
    let cumPaid = parseFloat(detail.loan.totalPaid);
    const now = new Date();
    const soon = new Date(now.getTime() + SEVEN_DAYS_MS);
    return detail.schedule.map((s) => {
      let cls = '';
      let badge;
      if (cumPaid >= s.payment) {
        cls = 'row-paid';
        badge = <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✅ ชำระแล้ว</span>;
        cumPaid -= s.payment;
      } else if (new Date(s.dueDate) < now) {
        cls = 'row-overdue';
        badge = <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>⚠️ เกินกำหนด</span>;
      } else if (new Date(s.dueDate) <= soon) {
        cls = 'row-near';
        badge = <span style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>🔔 ใกล้ครบ</span>;
      } else {
        badge = <span style={{ fontSize: 11, color: '#9ca3af' }}>รอชำระ</span>;
      }
      return { ...s, cls, badge };
    });
  }, [detail]);

  async function openPay() {
    setPayAmount('');
    setPayMethod('โอน');
    setSlipFile(null);
    setSlipPreview(null);
    setPayModalOpen(true);
    try {
      const b = await api('GET', '/api/auth/bank-info');
      setBankInfo(b && b.bankAccount ? b : null);
    } catch {
      setBankInfo(null);
    }
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

  async function submitPay() {
    if (!payAmount) return toast('กรุณากรอกยอดชำระ', 'error');
    if (!slipFile) return toast('กรุณาแนบสลิปการโอนเงิน', 'error');
    const fd = new FormData();
    fd.append('payAmount', payAmount);
    fd.append('method', payMethod);
    fd.append('slip', slipFile);
    try {
      const res = await api('POST', `/api/customer/loans/${id}/pay`, fd, true);
      toast(res.message, 'success');
      setPayModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  if (!detail || !computed) return null;
  const { loan, payments } = detail;
  const heroClass = computed.overdue ? 'overdue' : loan.loanStatus === 'pending' || loan.loanStatus === 'closed' ? loan.loanStatus : '';

  return (
    <div className="customer-body">
      <div className="c-header detail">
        <Link to="/customer">←</Link>
        <div className="c-header-info">
          <div className="c-header-title">สัญญา #{loan.id}</div>
          <div className="c-header-sub">{STATUS_LABELS[loan.loanStatus] || loan.loanStatus}</div>
        </div>
        <button className="btn btn-outline btn-sm c-header-print" onClick={() => window.open(`/api/loans/${id}/contract`, '_blank')}>
          🖨️ สัญญา
        </button>
      </div>

      <div className="c-content">
        <div className={`hero ${heroClass}`}>
          <div className="hero-label">วงเงินกู้</div>
          <div className="hero-amount">{formatMoney(computed.amount)} บาท</div>
          <div className="hero-grid">
            <div className="hero-item"><div className="val">{formatMoney(computed.paid)}</div><div className="lbl">ชำระแล้ว (บ.)</div></div>
            <div className="hero-item"><div className="val">{formatMoney(computed.remain)}</div><div className="lbl">คงเหลือ (บ.)</div></div>
            <div className="hero-item"><div className="val">{formatMoney(computed.pmt)}</div><div className="lbl">ค่างวด/เดือน</div></div>
          </div>
          <div className="hero-bar-wrap">
            <div className="hero-bar-label"><span>ความคืบหน้า</span><span>{computed.pct.toFixed(1)}%</span></div>
            <div className="hero-bar"><div className="hero-bar-fill" style={{ width: `${computed.pct}%` }} /></div>
          </div>
          <button className="pay-btn" disabled={loan.loanStatus !== 'active'} onClick={openPay}>
            {loan.loanStatus === 'active' ? '💳 ชำระเงิน / แนบสลิป' : loan.loanStatus === 'closed' ? '✅ ปิดสัญญาแล้ว' : '⏳ รอ Admin อนุมัติสัญญา'}
          </button>
        </div>

        <div className="c-card">
          <div className="c-card-title">📋 ข้อมูลสัญญา</div>
          <div className="info-row"><span className="lbl">วงเงินกู้</span><span className="val">{formatMoney(computed.amount)} บาท</span></div>
          <div className="info-row"><span className="lbl">อัตราดอกเบี้ย</span><span className="val">{loan.rate}% / ปี (ลดต้นลดดอก)</span></div>
          <div className="info-row"><span className="lbl">จำนวนงวด</span><span className="val">{loan.month} งวด</span></div>
          <div className="info-row"><span className="lbl">ค่างวด/เดือน</span><span className="val">{formatMoney(computed.pmt)} บาท</span></div>
          <div className="info-row"><span className="lbl">วันที่ทำสัญญา</span><span className="val">{formatDate(loan.date)}</span></div>
          <div className="info-row">
            <span className="lbl">วันครบกำหนด</span>
            <span className="val" style={{ color: computed.overdue ? '#dc2626' : 'inherit' }}>
              {formatDate(loan.dueDate)}{computed.overdue ? ' ⚠️' : ''}
            </span>
          </div>
          <div className="info-row"><span className="lbl">วัตถุประสงค์</span><span className="val">{loan.purpose || '-'}</span></div>
        </div>

        <div className="c-card">
          <div className="c-card-title">📅 ตารางผ่อนชำระ</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sch-table">
              <thead>
                <tr><th>งวด</th><th>วันครบกำหนด</th><th>ค่างวด</th><th>เงินต้น</th><th>ดอกเบี้ย</th><th>คงเหลือ</th><th>สถานะ</th></tr>
              </thead>
              <tbody>
                {scheduleRows.map((s) => (
                  <tr key={s.installment} className={s.cls}>
                    <td>{s.installment}</td>
                    <td>{s.dueDate}</td>
                    <td>{formatMoney(s.payment)}</td>
                    <td>{formatMoney(s.principal)}</td>
                    <td>{formatMoney(s.interest)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(s.balance)}</td>
                    <td style={{ textAlign: 'center' }}>{s.badge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="c-card">
          <div className="c-card-title">🧾 ประวัติการชำระ</div>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 16, fontSize: 14 }}>ยังไม่มีประวัติการชำระ</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="pay-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{formatMoney(p.payAmount)} <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280' }}>บาท</span></div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 3 }}>{formatDate(p.payDate)} · {p.method || 'โอน'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`pay-status ${PAY_STATUS_CLASS[p.stats] || ''}`}>{PAY_STATUS_ICON[p.stats] || ''} {p.stats}</div>
                    {p.cdnurl && (
                      <a href={p.cdnurl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1d4ed8', display: 'block', marginTop: 4 }}>
                        ดูสลิป 🧾
                      </a>
                    )}
                  </div>
                </div>
                {p.stats === 'ปฏิเสธ' && (
                  <div style={{ marginTop: 8, background: '#fee2e2', color: '#7f1d1d', borderRadius: 6, padding: '7px 10px', fontSize: 12 }}>
                    ❌ รายการนี้ถูกปฏิเสธ กรุณาติดต่อ Admin
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} variant="sheet">
        <div className="modal-title">💳 ชำระเงิน</div>
        <div className="pay-hint-box">💡 ค่างวดปกติ <strong>{formatMoney(computed.pmt)}</strong> บาท/เดือน</div>
        {bankInfo && (
          <div className="bank-info-box">
            <div className="bank-info-title">📤 โอนเงินมาที่</div>
            <div className="bank-info-content">
              {bankInfo.bankName && <div>🏦 {bankInfo.bankName}</div>}
              <div>💳 เลขบัญชี: <strong>{bankInfo.bankAccount}</strong></div>
              {bankInfo.bankAccountName && <div>👤 ชื่อบัญชี: <strong>{bankInfo.bankAccountName}</strong></div>}
              {bankInfo.promptpayId && <div>📱 พร้อมเพย์: <strong>{bankInfo.promptpayId}</strong></div>}
            </div>
          </div>
        )}
        <div className="fg">
          <label>ยอดชำระ (บาท) *</label>
          <input type="number" min="1" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </div>
        <div className="fg">
          <label>วิธีการชำระ</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <option value="โอน">โอนเงิน</option>
            <option value="QR Code">QR Code</option>
            <option value="เงินสด">เงินสด</option>
          </select>
        </div>
        <div className="fg" style={{ marginBottom: 20 }}>
          <label>สลิปการโอน *</label>
          <input type="file" accept="image/*" onChange={handleSlipChange} />
          {slipPreview && <img src={slipPreview} className="slip-preview-sheet" alt="ตัวอย่างสลิป" />}
        </div>
        <button className="submit-btn" onClick={submitPay}>📤 ส่งหลักฐานการชำระ</button>
        <button className="cancel-btn" onClick={() => setPayModalOpen(false)}>ยกเลิก</button>
      </Modal>
    </div>
  );
}
