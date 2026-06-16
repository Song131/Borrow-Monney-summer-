import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const MODES = { CUSTOMER: 'customer', CUSTOMER_REGISTER: 'creg', ADMIN: 'admin', ADMIN_REGISTER: 'register' };

export default function LoginPage() {
  const navigate = useNavigate();
  const adminAuth = useAdminAuth();
  const customerAuth = useCustomerAuth();

  const [mode, setMode] = useState(MODES.CUSTOMER);

  const [cCitizen, setCCitizen] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cErr, setCErr] = useState('');

  const [crFirst, setCrFirst] = useState('');
  const [crLast, setCrLast] = useState('');
  const [crCitizen, setCrCitizen] = useState('');
  const [crPhone, setCrPhone] = useState('');
  const [crOcc, setCrOcc] = useState('');
  const [crIncome, setCrIncome] = useState('');
  const [crAddress, setCrAddress] = useState('');
  const [crErr, setCrErr] = useState('');

  const [aUser, setAUser] = useState('');
  const [aPass, setAPass] = useState('');
  const [aPassVisible, setAPassVisible] = useState(false);
  const [aErr, setAErr] = useState('');

  const [rFirst, setRFirst] = useState('');
  const [rLast, setRLast] = useState('');
  const [rUser, setRUser] = useState('');
  const [rPass, setRPass] = useState('');
  const [rConfirm, setRConfirm] = useState('');
  const [rPassVisible, setRPassVisible] = useState(false);
  const [rConfirmVisible, setRConfirmVisible] = useState(false);
  const [rErr, setRErr] = useState('');

  const isAdminMode = mode === MODES.ADMIN || mode === MODES.ADMIN_REGISTER;

  useEffect(() => {
    if (!adminAuth.loading && adminAuth.admin) navigate('/dashboard', { replace: true });
  }, [adminAuth.loading, adminAuth.admin, navigate]);

  useEffect(() => {
    if (!customerAuth.loading && customerAuth.customer) navigate('/customer', { replace: true });
  }, [customerAuth.loading, customerAuth.customer, navigate]);

  function toggleMode() {
    setMode(isAdminMode ? MODES.CUSTOMER : MODES.ADMIN);
  }

  const matchHint = !rConfirm
    ? null
    : rPass === rConfirm
      ? { text: '✅ รหัสผ่านตรงกัน', color: '#16a34a' }
      : { text: '❌ รหัสผ่านไม่ตรงกัน', color: '#dc2626' };

  async function submitCustomerLogin(e) {
    e.preventDefault();
    setCErr('');
    try {
      await customerAuth.login(cCitizen.trim(), cPhone.trim());
      navigate('/customer');
    } catch (err) { setCErr(err.message); }
  }

  async function submitCustomerRegister(e) {
    e.preventDefault();
    setCrErr('');
    if (!crFirst.trim() || !crLast.trim()) return setCrErr('กรุณากรอกชื่อ-นามสกุล');
    if (crCitizen.length !== 13) return setCrErr('เลขบัตรประชาชนต้องมี 13 หลัก');
    if (!crPhone.trim()) return setCrErr('กรุณากรอกเบอร์โทรศัพท์');
    try {
      await customerAuth.register({
        firstName: crFirst.trim(),
        lastName: crLast.trim(),
        citizenNumber: crCitizen,
        phone: crPhone.trim(),
        occupation: crOcc.trim(),
        monthlyIncome: crIncome || null,
        address: crAddress.trim() || null,
      });
      navigate('/customer');
    } catch (err) { setCrErr(err.message); }
  }

  async function submitAdminLogin(e) {
    e.preventDefault();
    setAErr('');
    try {
      await adminAuth.login(aUser, aPass);
      navigate('/dashboard');
    } catch (err) { setAErr(err.message); }
  }

  async function submitAdminRegister(e) {
    e.preventDefault();
    setRErr('');
    const un = rUser.trim();
    if (!un) return setRErr('กรุณากรอกชื่อผู้ใช้');
    if (rPass.length < 6) return setRErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if (rPass !== rConfirm) return setRErr('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
    try {
      await adminAuth.register({ firstName: rFirst.trim(), lastName: rLast.trim(), username: un, password: rPass });
      navigate('/dashboard');
    } catch (err) { setRErr(err.message); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💰</div>
          <div className="auth-logo-title">ระบบกู้ยืมเงินรายย่อย</div>
          <div className="auth-logo-sub">Micro Loan Management System</div>
        </div>

        <div className={`panel${mode === MODES.CUSTOMER ? ' active' : ''}`}>
          <div className="mode-label customer">👤 ลูกหนี้</div>
          {cErr && <div className="err">❌ {cErr}</div>}
          <form onSubmit={submitCustomerLogin}>
            <div className="fg">
              <label>เลขบัตรประชาชน</label>
              <input type="text" maxLength={13} placeholder="เลข 13 หลัก" required
                value={cCitizen} onChange={(e) => setCCitizen(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label>เบอร์โทรศัพท์</label>
              <input type="tel" placeholder="0XX-XXX-XXXX" required value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
            </div>
            <button type="submit" className="btn-cust">เข้าสู่ระบบ</button>
          </form>
          <div className="reg-link" style={{ color: '#9ca3af' }}>
            ยังไม่มีบัญชี?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(MODES.CUSTOMER_REGISTER); }} style={{ color: 'var(--c-primary)' }}>สมัครสมาชิก</a>
          </div>
        </div>

        <div className={`panel${mode === MODES.CUSTOMER_REGISTER ? ' active' : ''}`}>
          <div className="mode-label customer">📝 สมัครสมาชิก ลูกหนี้</div>
          {crErr && <div className="err">❌ {crErr}</div>}
          <form onSubmit={submitCustomerRegister}>
            <div className="fg">
              <label>ชื่อ <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" placeholder="ชื่อ" value={crFirst} onChange={(e) => setCrFirst(e.target.value)} />
            </div>
            <div className="fg">
              <label>นามสกุล <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" placeholder="นามสกุล" value={crLast} onChange={(e) => setCrLast(e.target.value)} />
            </div>
            <div className="fg">
              <label>เลขบัตรประชาชน <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" maxLength={13} placeholder="เลข 13 หลัก" value={crCitizen} onChange={(e) => setCrCitizen(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="fg">
              <label>เบอร์โทรศัพท์ <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="tel" placeholder="0XX-XXX-XXXX" value={crPhone} onChange={(e) => setCrPhone(e.target.value)} />
            </div>
            <div className="fg">
              <label>อาชีพ <span style={{ color: '#9ca3af', fontWeight: 400 }}>(ไม่บังคับ)</span></label>
              <input type="text" placeholder="เช่น ค้าขาย, รับจ้าง" value={crOcc} onChange={(e) => setCrOcc(e.target.value)} />
            </div>
            <div className="fg">
              <label>รายได้ต่อเดือน (บาท) <span style={{ color: '#9ca3af', fontWeight: 400 }}>(ไม่บังคับ)</span></label>
              <input type="number" min="0" placeholder="0" value={crIncome} onChange={(e) => setCrIncome(e.target.value)} />
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label>ที่อยู่ <span style={{ color: '#9ca3af', fontWeight: 400 }}>(ไม่บังคับ)</span></label>
              <textarea rows={3} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด" value={crAddress} onChange={(e) => setCrAddress(e.target.value)} />
            </div>
            <button type="submit" className="btn-cust">สมัครสมาชิก</button>
          </form>
          <div className="reg-link" style={{ color: '#9ca3af' }}>
            มีบัญชีแล้ว?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(MODES.CUSTOMER); }} style={{ color: 'var(--c-primary)' }}>เข้าสู่ระบบ</a>
          </div>
        </div>

        <div className={`panel admin${mode === MODES.ADMIN ? ' active' : ''}`}>
          <div className="mode-label admin">👔 Admin / Staff</div>
          {aErr && <div className="err">❌ {aErr}</div>}
          <form onSubmit={submitAdminLogin}>
            <div className="fg">
              <label>ชื่อผู้ใช้</label>
              <input type="text" autoComplete="username" placeholder="username" required value={aUser} onChange={(e) => setAUser(e.target.value)} />
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label>รหัสผ่าน</label>
              <div className="pw-wrap">
                <input type={aPassVisible ? 'text' : 'password'} autoComplete="current-password" placeholder="รหัสผ่าน" required value={aPass} onChange={(e) => setAPass(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setAPassVisible((v) => !v)}>{aPassVisible ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <button type="submit" className="btn-admin">เข้าสู่ระบบ Admin</button>
          </form>
          <div className="reg-link">
            ยังไม่มีบัญชี?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(MODES.ADMIN_REGISTER); }}>สมัครสมาชิก Admin</a>
          </div>
        </div>

        <div className={`panel admin${mode === MODES.ADMIN_REGISTER ? ' active' : ''}`}>
          <div className="mode-label admin">📝 สมัคร Admin / Staff</div>
          {rErr && <div className="err">❌ {rErr}</div>}
          <form onSubmit={submitAdminRegister}>
            <div className="fg">
              <label>ชื่อ</label>
              <input type="text" placeholder="ชื่อ" value={rFirst} onChange={(e) => setRFirst(e.target.value)} />
            </div>
            <div className="fg">
              <label>นามสกุล</label>
              <input type="text" placeholder="นามสกุล" value={rLast} onChange={(e) => setRLast(e.target.value)} />
            </div>
            <div className="fg">
              <label>ชื่อผู้ใช้ <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" autoComplete="off" placeholder="username" value={rUser} onChange={(e) => setRUser(e.target.value)} />
            </div>
            <div className="fg">
              <label>รหัสผ่าน <span style={{ color: '#dc2626' }}>*</span></label>
              <div className="pw-wrap">
                <input type={rPassVisible ? 'text' : 'password'} placeholder="อย่างน้อย 6 ตัว" value={rPass} onChange={(e) => setRPass(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setRPassVisible((v) => !v)}>{rPassVisible ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label>ยืนยันรหัสผ่าน <span style={{ color: '#dc2626' }}>*</span></label>
              <div className="pw-wrap">
                <input type={rConfirmVisible ? 'text' : 'password'} placeholder="กรอกรหัสผ่านอีกครั้ง" value={rConfirm} onChange={(e) => setRConfirm(e.target.value)} />
                <button type="button" className="pw-eye" onClick={() => setRConfirmVisible((v) => !v)}>{rConfirmVisible ? '🙈' : '👁️'}</button>
              </div>
              {matchHint && <div style={{ fontSize: 12, marginTop: 4, color: matchHint.color }}>{matchHint.text}</div>}
            </div>
            <button type="submit" className="btn-admin">สมัครสมาชิก</button>
          </form>
          <div className="reg-link">
            มีบัญชีแล้ว?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setMode(MODES.ADMIN); }}>เข้าสู่ระบบ</a>
          </div>
        </div>

        <button className={`admin-toggle${isAdminMode ? ' is-admin' : ''}`} onClick={toggleMode} title="สลับโหมด">
          <span className="dot" />
          <span>{isAdminMode ? '← ลูกหนี้' : 'Admin'}</span>
        </button>
      </div>
    </div>
  );
}
