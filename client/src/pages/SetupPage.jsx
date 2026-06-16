import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function SetupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api('POST', '/api/auth/setup', { firstName, lastName, username, password, email });
      setMsg({ type: 'success', text: 'สร้างบัญชีสำเร็จ กำลังไปหน้าเข้าสู่ระบบ...' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420, width: 420 }}>
        <div className="login-logo">ตั้งค่าระบบครั้งแรก</div>
        <div className="login-subtitle">สร้างบัญชีผู้ดูแลระบบ (Admin)</div>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>ชื่อ</label>
              <input type="text" placeholder="ชื่อ" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>นามสกุล</label>
              <input type="text" placeholder="นามสกุล" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>ชื่อผู้ใช้</label>
              <input type="text" placeholder="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>รหัสผ่าน</label>
              <input type="password" placeholder="รหัสผ่าน" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>อีเมล</label>
              <input type="email" placeholder="email (ไม่บังคับ)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
            สร้างบัญชีแอดมิน
          </button>
        </form>
      </div>
    </div>
  );
}
