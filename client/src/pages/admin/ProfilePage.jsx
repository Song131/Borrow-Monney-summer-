import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAdminAuth } from '../../context/AdminAuthContext';

const THAI_BANKS = [
  'ธนาคารกรุงเทพ (BBL)', 'ธนาคารกสิกรไทย (KBANK)', 'ธนาคารกรุงไทย (KTB)',
  'ธนาคารไทยพาณิชย์ (SCB)', 'ธนาคารกรุงศรีอยุธยา (BAY)', 'ธนาคารทหารไทยธนชาต (TTB)',
  'ธนาคารออมสิน (GSB)', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)', 'ธนาคารซีไอเอ็มบีไทย (CIMB)',
  'ธนาคารยูโอบี (UOB)',
];

export default function ProfilePage() {
  const { setTitle } = useOutletContext();
  const toast = useToast();
  const { refetch: refetchAdmin } = useAdminAuth();
  useEffect(() => setTitle('🏦 ตั้งค่าบัญชี'), [setTitle]);

  const [profile, setProfile] = useState({ username: '', firstName: '', lastName: '', email: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [bank, setBank] = useState({ bankName: '', bankAccount: '', bankAccountName: '', promptpayId: '' });

  useEffect(() => {
    api('GET', '/api/auth/my-profile')
      .then((p) => setProfile({
        username: p.username || '',
        firstName: p.First_Name || '',
        lastName: p.Last_Name || '',
        email: p.email || '',
      }))
      .catch((err) => toast(err.message, 'error'));
    api('GET', '/api/auth/bank-info')
      .then((b) => setBank({
        bankName: b.bankName || '',
        bankAccount: b.bankAccount || '',
        bankAccountName: b.bankAccountName || '',
        promptpayId: b.promptpayId || '',
      }))
      .catch(() => {});
  }, [toast]);

  async function saveProfile(e) {
    e.preventDefault();
    if (newPassword) {
      if (!currentPassword) return toast('กรุณากรอกรหัสผ่านปัจจุบัน', 'error');
      if (newPassword !== confirmPassword) return toast('รหัสผ่านใหม่และยืนยันไม่ตรงกัน', 'error');
    }
    try {
      const res = await api('PUT', '/api/auth/my-profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      toast(res.message, 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      refetchAdmin();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function saveBank(e) {
    e.preventDefault();
    try {
      const res = await api('PUT', '/api/auth/bank-info', bank);
      toast(res.message, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <div className="card-title">ข้อมูลส่วนตัว</div>
        <form onSubmit={saveProfile}>
          <div className="form-grid">
            <div className="form-group full">
              <label>ชื่อผู้ใช้</label>
              <input type="text" value={profile.username} readOnly />
            </div>
            <div className="form-group">
              <label>ชื่อ</label>
              <input type="text" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>นามสกุล</label>
              <input type="text" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>อีเมล</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>รหัสผ่านปัจจุบัน <small>(กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน)</small></label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>รหัสผ่านใหม่</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label>ยืนยันรหัสผ่านใหม่</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">บันทึก</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">ข้อมูลบัญชีธนาคาร (สำหรับรับเงินจากลูกหนี้)</div>
        <form onSubmit={saveBank}>
          <div className="form-grid">
            <div className="form-group full">
              <label>ธนาคาร</label>
              <select value={bank.bankName} onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}>
                <option value="">-- เลือกธนาคาร --</option>
                {THAI_BANKS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>เลขที่บัญชี</label>
              <input
                type="text"
                value={bank.bankAccount}
                onChange={(e) => setBank((b) => ({ ...b, bankAccount: e.target.value.replace(/[^0-9-]/g, '') }))}
              />
            </div>
            <div className="form-group">
              <label>ชื่อบัญชี</label>
              <input type="text" value={bank.bankAccountName} onChange={(e) => setBank((b) => ({ ...b, bankAccountName: e.target.value }))} />
            </div>
            <div className="form-group full">
              <label>พร้อมเพย์</label>
              <input
                type="text"
                maxLength={13}
                value={bank.promptpayId}
                onChange={(e) => setBank((b) => ({ ...b, promptpayId: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">บันทึก</button>
          </div>
        </form>

        {bank.bankAccount && (
          <div className="bank-info-box" style={{ marginTop: 16 }}>
            <div className="bank-info-title">👁️ ตัวอย่างที่ลูกหนี้จะเห็น</div>
            <div className="bank-info-content">
              {bank.bankName && <div>🏦 {bank.bankName}</div>}
              <div>💳 เลขบัญชี: <strong>{bank.bankAccount}</strong></div>
              {bank.bankAccountName && <div>👤 ชื่อบัญชี: <strong>{bank.bankAccountName}</strong></div>}
              {bank.promptpayId && <div>📱 พร้อมเพย์: <strong>{bank.promptpayId}</strong></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
