import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../lib/format';
import Modal from '../../components/Modal';

const EMPTY_FORM = { firstName: '', lastName: '', citizenNumber: '', phone: '', occupation: '', monthlyIncome: '', address: '' };

export default function CustomersPage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  useEffect(() => setTitle('ลูกหนี้'), [setTitle]);

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/customers');
      setCustomers(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.phone || ''} ${c.citizenNumber || ''}`.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function openEditModal(id) {
    try {
      const c = await api('GET', `/api/customers/${id}`);
      setEditingId(id);
      setForm({
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        citizenNumber: c.citizenNumber || '',
        phone: c.phone || '',
        occupation: c.occupation || '',
        monthlyIncome: c.monthlyIncome || '',
        address: c.address || '',
      });
      setModalOpen(true);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return toast('กรุณากรอกชื่อ-นามสกุล', 'error');
    try {
      if (editingId) {
        await api('PUT', `/api/customers/${editingId}`, form);
        toast('แก้ไขข้อมูลเรียบร้อย', 'success');
      } else {
        await api('POST', '/api/customers', form);
        toast('เพิ่มข้อมูลลูกค้าเรียบร้อย', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="search-bar">
        <input
          type="text"
          placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openAddModal}>+ เพิ่มลูกหนี้</button>
      </div>

      <div className="card">
        <div className="card-title">รายชื่อลูกหนี้ ({filtered.length})</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>อาชีพ</th><th>รายได้/เดือน</th>
                <th>สัญญาทั้งหมด</th><th>หนี้คงค้าง</th><th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b7280' }}>ไม่พบข้อมูล</td></tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td>{c.firstName} {c.lastName}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.occupation || '-'}</td>
                    <td>{c.monthlyIncome ? formatMoney(c.monthlyIncome) : '-'}</td>
                    <td>{c.totalLoans || 0}</td>
                    <td style={{
                      color: parseFloat(c.activeAmount) > 0 ? '#dc2626' : '#6b7280',
                      fontWeight: parseFloat(c.activeAmount) > 0 ? 600 : 400,
                    }}>
                      {formatMoney(c.activeAmount)}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openEditModal(c.id)}>แก้ไข</button>{' '}
                      <Link className="btn btn-outline btn-sm" to={`/loans?customer=${c.id}`}>สัญญา</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal-title">{editingId ? 'แก้ไขข้อมูลลูกหนี้' : 'เพิ่มลูกหนี้ใหม่'}</div>
        <div className="form-grid">
          <div className="form-group">
            <label>ชื่อ *</label>
            <input type="text" value={form.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>นามสกุล *</label>
            <input type="text" value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
          </div>
          <div className="form-group">
            <label>เลขบัตรประชาชน</label>
            <input type="text" maxLength={13} value={form.citizenNumber} onChange={(e) => updateField('citizenNumber', e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="form-group">
            <label>เบอร์โทร</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>อาชีพ</label>
            <input type="text" value={form.occupation} onChange={(e) => updateField('occupation', e.target.value)} />
          </div>
          <div className="form-group">
            <label>รายได้ต่อเดือน</label>
            <input type="number" min="0" value={form.monthlyIncome} onChange={(e) => updateField('monthlyIncome', e.target.value)} />
          </div>
          <div className="form-group full">
            <label>ที่อยู่</label>
            <textarea rows={2} value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}>บันทึก</button>
        </div>
      </Modal>
    </>
  );
}
