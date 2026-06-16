import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { formatMoney, formatDate } from '../../lib/format';
import { calcPMT } from '../../lib/loan';
import Modal from '../../components/Modal';

const MONTH_OPTIONS = [3, 6, 12, 18, 24, 36];
const STATUS_LABELS = { active: 'กำลังดำเนินการ', pending: 'รออนุมัติ', closed: 'ปิดสัญญา', rejected: 'ปฏิเสธ' };
const RELATIONSHIPS = ['คู่สมรส', 'บิดา/มารดา', 'พี่/น้อง', 'บุตร', 'ญาติ', 'เพื่อน', 'อื่นๆ'];

function emptyGuarantor() {
  return { key: Math.random().toString(36).slice(2), name: '', phone: '', relationship: '', citizenNumber: '' };
}

export default function CustomerDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth();

  const [loans, setLoans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState('');
  const [purpose, setPurpose] = useState('');
  const [guarantors, setGuarantors] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/customer/loans');
      setLoans(data);
    } catch (err) {
      if (err.message.includes('ยังไม่ได้')) navigate('/login');
      else toast(err.message, 'error');
    }
  }, [toast, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const active = loans.filter((l) => l.loanStatus === 'active');
    const totalOutstanding = active.reduce((sum, l) => sum + Math.max(0, parseFloat(l.amount) - parseFloat(l.totalPaid)), 0);
    const totalPaid = loans.reduce((sum, l) => sum + parseFloat(l.totalPaid), 0);
    return { totalOutstanding, totalPaid, count: loans.length };
  }, [loans]);

  const preview = useMemo(() => {
    const amt = parseFloat(amount);
    const m = parseInt(month, 10);
    if (!amt || !m || amt <= 0) return null;
    const pmt = calcPMT(amt, 15, m);
    const total = pmt * m;
    return { pmt, total, interest: total - amt };
  }, [amount, month]);

  function openRequest() {
    setAmount('');
    setMonth('');
    setPurpose('');
    setGuarantors([]);
    setModalOpen(true);
  }

  function addGuarantor() {
    setGuarantors((g) => [...g, emptyGuarantor()]);
  }
  function removeGuarantor(key) {
    setGuarantors((g) => g.filter((row) => row.key !== key));
  }
  function updateGuarantor(key, field, value) {
    setGuarantors((g) => g.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  async function submitRequest() {
    if (!amount || parseFloat(amount) <= 0) return toast('กรุณากรอกวงเงินที่ต้องการ', 'error');
    if (parseFloat(amount) > 50000) return toast('วงเงินสูงสุดไม่เกิน 50,000 บาท', 'error');
    if (!month) return toast('กรุณาเลือกจำนวนงวด', 'error');
    const payload = {
      amount,
      month,
      purpose,
      guarantors: guarantors
        .filter((g) => g.name.trim())
        .map((g) => ({ name: g.name.trim(), phone: g.phone.trim(), relationship: g.relationship, citizenNumber: g.citizenNumber.trim() })),
    };
    try {
      const res = await api('POST', '/api/customer/request-loan', payload);
      toast(res.message, 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="customer-body">
      <div className="c-header">
        <div className="c-header-top">
          <div>
            <div className="greeting">ยินดีต้อนรับ</div>
            <div className="c-name">{customer?.name || '-'}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
        <div className="summary-strip">
          <div className="s-box"><div className="s-val">{formatMoney(summary.totalOutstanding)}</div><div className="s-lbl">หนี้คงค้าง (บ.)</div></div>
          <div className="s-box"><div className="s-val">{formatMoney(summary.totalPaid)}</div><div className="s-lbl">ชำระแล้ว (บ.)</div></div>
          <div className="s-box"><div className="s-val">{summary.count}</div><div className="s-lbl">สัญญาทั้งหมด</div></div>
        </div>
      </div>

      <div className="c-content">
        <div className="section-title">บริการ</div>
        <button className="request-card" onClick={openRequest}>
          <div className="request-text" style={{ flex: 1 }}>
            <div className="title">ยื่นขอกู้ยืมเงิน</div>
            <div className="sub">วงเงินสูงสุด 50,000 บาท | ดอกเบี้ย 15%/ปี</div>
          </div>
          <div className="req-arrow">›</div>
        </button>

        <div className="section-title">สัญญากู้ยืมของฉัน</div>
        {loans.length === 0 ? (
          <div className="empty">
            <div className="e-text">ยังไม่มีสัญญากู้ยืม<br />กด <strong>"ยื่นขอกู้ยืมเงิน"</strong> ด้านบนเพื่อเริ่มต้น</div>
          </div>
        ) : (
          loans.map((l) => {
            const amt = parseFloat(l.amount);
            const paid = parseFloat(l.totalPaid);
            const remain = Math.max(0, amt - paid);
            const pct = Math.min(100, (paid / amt) * 100);
            const overdue = l.loanStatus === 'active' && new Date(l.dueDate) < new Date();
            const cls = overdue ? 'overdue' : l.loanStatus;
            const pmt = calcPMT(amt, parseFloat(l.rate), l.month);
            return (
              <Link key={l.id} className={`loan-card ${cls}`} to={`/customer/loans/${l.id}`}>
                <div className="lc-top">
                  <div>
                    <div className="lc-amount">{formatMoney(amt)} <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>บาท</span></div>
                    <div className="lc-meta">{l.rate}%/ปี · {l.month} งวด · {formatMoney(pmt)} บ./เดือน</div>
                  </div>
                  <div className="lc-status">{STATUS_LABELS[l.loanStatus] || l.loanStatus}</div>
                </div>
                <div className="prog-wrap">
                  <div className="prog"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
                  <div className="prog-labels">
                    <span>ชำระแล้ว {formatMoney(paid)} บ.</span>
                    <span>คงเหลือ {formatMoney(remain)} บ.</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>ครบกำหนด {formatDate(l.dueDate)} · สัญญา #{l.id}</div>
              </Link>
            );
          })
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} variant="sheet">
        <div className="modal-title">ยื่นขอกู้ยืมเงิน</div>
        <div className="modal-sub">กรอกข้อมูลแล้ว Admin จะตรวจสอบและอนุมัติ</div>

        <div className="alert alert-warning" style={{ fontSize: 12 }}>
          อัตราดอกเบี้ยตามกฎหมาย ป.พ.พ. มาตรา 654 ไม่เกิน <strong>15% ต่อปี</strong>
        </div>

        <div className="fg">
          <label>วงเงินที่ต้องการ (บาท) *</label>
          <input type="number" placeholder="1,000 – 50,000" min="100" max="50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="fg">
          <label>จำนวนงวด (เดือน) *</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">-- เลือกจำนวนงวด --</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m} เดือน</option>
            ))}
          </select>
        </div>

        {preview && (
          <div className="calc-box">
            <div className="calc-box-title">ประมาณการค่างวด</div>
            <div className="calc-grid">
              <div className="calc-item"><div className="cv">{formatMoney(preview.pmt)} บ.</div><div className="cl">ค่างวด/เดือน</div></div>
              <div className="calc-item"><div className="cv">{formatMoney(preview.interest)} บ.</div><div className="cl">ดอกเบี้ยรวม</div></div>
              <div className="calc-item"><div className="cv">{formatMoney(preview.total)} บ.</div><div className="cl">ยอดรวมทั้งหมด</div></div>
            </div>
          </div>
        )}

        <div className="fg">
          <label>วัตถุประสงค์การกู้</label>
          <textarea rows={2} placeholder="เช่น ทุนค้าขาย, ค่าใช้จ่ายฉุกเฉิน, ซื้ออุปกรณ์..." value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>ผู้ค้ำประกัน</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>ไม่บังคับ — เพิ่มเพื่อเพิ่มโอกาสอนุมัติ</div>
            </div>
            <button type="button" className="guarantor-add" onClick={addGuarantor}>+ เพิ่ม</button>
          </div>
          {guarantors.map((g, idx) => (
            <div key={g.key} className="guarantor-row">
              <div className="guarantor-row-head">
                <span>ผู้ค้ำประกันคนที่ {idx + 1}</span>
                <button type="button" className="guarantor-remove" onClick={() => removeGuarantor(g.key)}>ลบ</button>
              </div>
              <div className="fg">
                <label>ชื่อ-นามสกุล *</label>
                <input type="text" placeholder="ชื่อ-นามสกุล ผู้ค้ำประกัน" value={g.name} onChange={(e) => updateGuarantor(g.key, 'name', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="fg" style={{ margin: 0 }}>
                  <label>เบอร์โทร</label>
                  <input type="tel" placeholder="0XX-XXX-XXXX" value={g.phone} onChange={(e) => updateGuarantor(g.key, 'phone', e.target.value)} />
                </div>
                <div className="fg" style={{ margin: 0 }}>
                  <label>ความสัมพันธ์</label>
                  <select value={g.relationship} onChange={(e) => updateGuarantor(g.key, 'relationship', e.target.value)}>
                    <option value="">-- เลือก --</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label>เลขบัตรประชาชน</label>
                <input
                  type="text"
                  placeholder="เลข 13 หลัก"
                  maxLength={13}
                  value={g.citizenNumber}
                  onChange={(e) => updateGuarantor(g.key, 'citizenNumber', e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          ))}
        </div>

        <button className="submit-btn" onClick={submitRequest}>ยื่นขอกู้</button>
        <button className="cancel-btn" onClick={() => setModalOpen(false)}>ยกเลิก</button>
      </Modal>
    </div>
  );
}
