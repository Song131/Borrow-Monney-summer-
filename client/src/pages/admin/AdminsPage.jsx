import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import Modal from '../../components/Modal';

const EMPTY_FORM = { firstName: '', lastName: '', username: '', password: '', email: '' };

export default function AdminsPage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  const { admin: currentAdmin } = useAdminAuth();
  useEffect(() => setTitle('⚙️ จัดการแอดมิน'), [setTitle]);

  const [admins, setAdmins] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwTargetId, setPwTargetId] = useState(null);
  const [pwValue, setPwValue] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api('GET', '/api/auth/admins');
      setAdmins(data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddModal() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function saveAdmin() {
    if (!form.username.trim() || !form.password) return toast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
    try {
      const res = await api('POST', '/api/auth/admins', form);
      toast(res.message, 'success');
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function deleteAdmin(adminId, username) {
    if (!window.confirm(`ต้องการลบแอดมิน "${username}"?`)) return;
    try {
      const res = await api('DELETE', `/api/auth/admins/${adminId}`);
      toast(res.message, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openPwModal(adminId) {
    setPwTargetId(adminId);
    setPwValue('');
    setPwModalOpen(true);
  }

  async function changePassword() {
    if (!pwValue) return toast('กรุณากรอกรหัสผ่านใหม่', 'error');
    try {
      const res = await api('PUT', `/api/auth/admins/${pwTargetId}/password`, { password: pwValue });
      toast(res.message, 'success');
      setPwModalOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <div className="alert alert-info">ℹ️ แอดมินทุกคนมีสิทธิ์เท่ากันในการจัดการระบบ</div>

      <div className="card">
        <div className="card-title">รายชื่อแอดมิน</div>
        <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={openAddModal}>+ เพิ่มแอดมิน</button>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>ชื่อ-นามสกุล</th><th>ชื่อผู้ใช้</th><th>อีเมล</th><th>จัดการ</th></tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.id}>
                  <td>{i + 1}</td>
                  <td>{a.First_Name} {a.Last_Name}</td>
                  <td><code>{a.username}</code></td>
                  <td>{a.email || '-'}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => openPwModal(a.id)}>เปลี่ยนรหัสผ่าน</button>{' '}
                    {a.id === currentAdmin?.id ? (
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>(คุณ)</span>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAdmin(a.id, a.username)}>ลบ</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal-title">เพิ่มแอดมินใหม่</div>
        <div className="form-grid">
          <div className="form-group">
            <label>ชื่อ</label>
            <input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>นามสกุล</label>
            <input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>ชื่อผู้ใช้ *</label>
            <input type="text" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน *</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="form-group full">
            <label>อีเมล</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={saveAdmin}>บันทึก</button>
        </div>
      </Modal>

      <Modal open={pwModalOpen} onClose={() => setPwModalOpen(false)}>
        <div className="modal-title">เปลี่ยนรหัสผ่าน</div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>รหัสผ่านใหม่ *</label>
          <input type="password" value={pwValue} onChange={(e) => setPwValue(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={() => setPwModalOpen(false)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={changePassword}>บันทึก</button>
        </div>
      </Modal>
    </>
  );
}
