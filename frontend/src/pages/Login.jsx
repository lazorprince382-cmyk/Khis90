import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import campus from '../assets/campus-login.jpg';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ '--login-campus': `url(${campus})` }}>
      <img src={logo} alt="Kabojja International School" className="login-brand-logo" />
      <div className="login-dots" />
      <div className="login-photo" aria-hidden="true" />
      <div className="login-overlay" aria-hidden="true" />
      <div className="login-wave login-wave-one" aria-hidden="true" />
      <div className="login-wave login-wave-two" aria-hidden="true" />

      <section className="login-left">
        <div className="login-welcome">
          <h1>Welcome Back!</h1>
          <p className="login-tagline">Sign in to continue to your dashboard</p>
          <div className="login-feature-list">
            <div className="login-feature">
              <span className="login-feature-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.7-2.9 8.5-7 10-4.1-1.5-7-5.3-7-10V6l7-3z"/><path d="M9.5 12l1.7 1.7 3.8-4"/></svg>
              </span>
              <span><strong>Secure Access</strong><small>Your data is protected with enterprise-grade security.</small></span>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-4"/><path d="M12 16V8"/><path d="M16 16v-6"/><path d="M18 7l2-2"/><path d="M15 5h5v5"/></svg>
              </span>
              <span><strong>Smart Management</strong><small>Manage academics, students, and staff efficiently.</small></span>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <span><strong>Better Education</strong><small>Empowering educators to inspire learners.</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-right">
        <div className="login-card">
          <h2>Staff Login</h2>
          <p className="login-sub">Sign in to access the dashboard</p>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required autoFocus />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                <button type="button" className="login-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>{!showPassword && <path d="M4 4l16 16"/>}</svg>
                </button>
              </div>
            </div>
            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button type="button" className="login-link">Forgot password?</button>
            </div>
            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </section>
      <footer className="login-footer">© 2026 Kabojja International School. All rights reserved.</footer>
    </div>
  );
}
