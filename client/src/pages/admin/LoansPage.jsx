import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney, formatDate, daysOverdue } from '../../lib/format';
import { calcPMT } from '../../lib/loan';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'active', label: 'กำลังดำเนินการ' },
  { value: 'closed', label: 'ปิดสัญญา' },
  { value: 'rejected', label: 'ปฏิเสธ' },
];

function emptyGuarantor() {
  return { key: Math.random().toString(36).slice(2), name: '', phone: '', citizenNumber: '', relationship: '' };
}

export default function LoansPage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  useEffect(() => setTitle('📋 สัญญากู้ยืม'), [setTitle]);

  const [loans, setLoans] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('15');
  const [month, setMonth] = useState('');
  const [method, setMethod] = useState('รายเดือน');
  const [purpose, setPurpose] = useState('');
  const [guarantors, setGuarantors] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/loans');
      setLoans(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => {
      if (statusFilter && l.loanStatus !== statusFilter) return false;
      if (!q) return true;
      return `${l.firstName} ${l.lastName}`.toLowerCase().includes(q);
    });
  }, [loans, search, statusFilter]);

  const customerMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return allCustomers
      .filter((c) => `${c.firstName} ${c.lastName} ${c.phone || ''}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allCustomers, customerSearch]);

  async function openAddModal() {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setAmount('');
    setRate('15');
    setMonth('');
    setMethod('รายเดือน');
    setPurpose('');
    setGuarantors([]);
    try {
      const data = await api('GET', '/api/customers');
      setAllCustomers(data);
    } catch (err) {
      toast(err.message, 'error');
    }
    setModalOpen(true);
  }

  function selectCustomer(c) {
    setSelectedCustomer(c);
    setCustomerSearch('');
  }

  function clearCustomer() {
    setSelectedCustomer(null);
  }

  const preview = useMemo(() => {
    const amt = parseFloat(amount);
    const r = parseFloat(rate);
    const m = parseInt(month, 10);
    if (!amt || !r || !m || amt <= 0) return null;
    const pmt = calcPMT(amt, r, m);
    const total = pmt * m;
    return { pmt, total, interest: total - amt };
  }, [amount, rate, month]);

  function addGuarantor() {
    setGuarantors((g) => [...g, emptyGuarantor()]);
  }

  function removeGuarantor(key) {
    setGuarantors((g) => g.filter((row) => row.key !== key));
  }

  function updateGuarantor(key, field, value) {
    setGuarantors((g) => g.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  async function handleSave() {
    if (!selectedCustomer) return toast('กรุณาเลือกลูกหนี้', 'error');
    if (!amount || !month) return toast('กรุณากรอกวงเงินและจำนวนงวด', 'error');
    const payload = {
      customer_id: selectedCustomer.id,
      amount,
      rate,
      month,
      purpose,
      guarantors: guarantors
        .filter((g) => g.name.trim())
        .map((g) => ({
          name: g.name.trim(),
          phone: g.phone.trim(),
          citizenNumber: g.citizenNumber.trim(),
          relationship: g.relationship,
        })),
    };
    try {
      const res = await api('POST', '/api/loans', payload);
      toast(res.message, 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function approveLoan(id) {
    if (!window.confirm('ต้องการอนุมัติสัญญานี้?')) return;
    try {
      const res = await api('PUT', `/api/loans/${id}/status`, { status: 'active' });
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="search-bar">
        <input type="text" placeholder="ค้นหาชื่อลูกหนี้..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={openAddModal}>+ สร้างสัญญาใหม่</button>
      </div>

      <div className="card">
        <div className="card-title">สัญญากู้ยืม ({filtered.length})</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>ลูกหนี้</th><th>วงเงิน</th><th>ดอกเบี้ย</th><th>งวด</th><th>ค่างวด/เดือน</th>
                <th>ชำระแล้ว</th><th>คงเหลือ</th><th>ครบกำหนด</th><th>สถานะ</th><th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#6b7280' }}>ไม่พบข้อมูล</td></tr>
              ) : (
                filtered.map((l, i) => {
                  const overdue = l.loanStatus === 'active' && new Date(l.dueDate) < new Date();
                  const pmt = calcPMT(parseFloat(l.amount), parseFloat(l.rate), l.month);
                  const remaining = parseFloat(l.amount) - parseFloat(l.totalPaid);
                  return (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td>{l.firstName} {l.lastName}<br /><small style={{ color: '#9ca3af' }}>{l.phone}</small></td>
                      <td>{formatMoney(l.amount)}</td>
                      <td>{l.rate}%</td>
                      <td>{l.month}</td>
                      <td>{formatMoney(pmt)}</td>
                      <td>{formatMoney(l.totalPaid)}</td>
                      <td>{formatMoney(remaining)}</td>
                      <td style={{ color: overdue ? '#dc2626' : 'inherit' }}>
                        {formatDate(l.dueDate)}{overdue ? ` (เกิน ${daysOverdue(l.dueDate)} วัน)` : ''}
                      </td>
                      <td><StatusBadge status={l.loanStatus} /></td>
                      <td>
                        <Link className="btn btn-outline btn-sm" to={`/loans/${l.id}`}>ดู</Link>{' '}
                        {l.loanStatus === 'pending' && (
                          <button className="btn btn-success btn-sm" onClick={() => approveLoan(l.id)}>อนุมัติ</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <div className="modal-title">สร้างสัญญากู้ยืมใหม่</div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>ลูกหนี้ *</label>
          {selectedCustomer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f3f4f6', borderRadius: 7 }}>
              <span>{selectedCustomer.firstName} {selectedCustomer.lastName} ({selectedCustomer.phone || '-'})</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={clearCustomer}>ล้าง</button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือเบอร์โทรลูกหนี้..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerMatches.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {customerMatches.map((c) => (
                    <div key={c.id} style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => selectCustomer(c)}>
                      {c.firstName} {c.lastName} ({c.phone || '-'})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-grid-3">
          <div className="form-group">
            <label>วงเงินกู้ (บาท) * <small>(สูงสุด 50,000)</small></label>
            <input type="number" max="50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label>อัตราดอกเบี้ย (%/ปี) <small>(สูงสุด 15)</small></label>
            <input type="number" max="15" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>จำนวนงวด (เดือน) *</label>
            <input type="number" min="1" max="60" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ margin: '16px 0' }}>
          <label>รูปแบบการผ่อนชำระ</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="รายเดือน">รายเดือน</option>
            <option value="รายสัปดาห์">รายสัปดาห์</option>
          </select>
        </div>

        {preview && (
          <div className="calc-box" style={{ display: 'block' }}>
            <div className="calc-box-title">📊 ประมาณการค่างวด</div>
            <div className="calc-grid">
              <div className="calc-item"><div className="cv">{formatMoney(preview.pmt)}</div><div className="cl">ค่างวด/เดือน</div></div>
              <div className="calc-item"><div className="cv">{formatMoney(preview.interest)}</div><div className="cl">ดอกเบี้ยรวม</div></div>
              <div className="calc-item"><div className="cv">{formatMoney(preview.total)}</div><div className="cl">ยอดรวมทั้งหมด</div></div>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>วัตถุประสงค์การกู้</label>
          <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>ผู้ค้ำประกัน (ไม่บังคับ)</strong>
            <button type="button" className="guarantor-add" onClick={addGuarantor}>+ เพิ่ม</button>
          </div>
          {guarantors.map((g, idx) => (
            <div key={g.key} className="guarantor-row">
              <div className="guarantor-row-head">
                <span>ผู้ค้ำประกันคนที่ {idx + 1}</span>
                <button type="button" className="guarantor-remove" onClick={() => removeGuarantor(g.key)}>ลบ</button>
              </div>
              <div className="form-grid">
                <div className="form-group full">
                  <label>ชื่อ-นามสกุล</label>
                  <input type="text" value={g.name} onChange={(e) => updateGuarantor(g.key, 'name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร</label>
                  <input type="tel" value={g.phone} onChange={(e) => updateGuarantor(g.key, 'phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ความสัมพันธ์</label>
                  <input type="text" value={g.relationship} onChange={(e) => updateGuarantor(g.key, 'relationship', e.target.value)} />
                </div>
                <div className="form-group full">
                  <label>เลขบัตรประชาชน</label>
                  <input type="text" maxLength={13} value={g.citizenNumber} onChange={(e) => updateGuarantor(g.key, 'citizenNumber', e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}>บันทึก</button>
        </div>
      </Modal>
    </>
  );
}
