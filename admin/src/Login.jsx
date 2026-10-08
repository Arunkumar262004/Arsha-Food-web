import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import { errMsg } from './lib/api';
import Icon from './components/Icon';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = "Sign in · Inofex Restaurant Admin"; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const admin = await login({ email, password, remember });
      toast.success(`Welcome back, ${admin.name}!`);
    } catch (err) {
      setError(errMsg(err, 'Could not sign in. Check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="left-inner">
          <div className="left-badge"><span className="pill-ring" />Admin console</div>
          <h1 className="left-headline">Run your store<br />from <span className="accent">one dashboard.</span></h1>
          <p className="left-desc">
            Track sales and orders as they happen, manage your menu, and control exactly what each team member can access.
          </p>
          <div className="left-preview" aria-hidden="true">
            <div className="lp-card">
              <span>Revenue</span><strong>₹1,90,230</strong><em>▲ 12.5%</em>
              <svg viewBox="0 0 120 36"><path d="M0 30 L15 26 L30 28 L45 18 L60 21 L75 12 L90 15 L105 6 L120 8" fill="none" stroke="#2F6BFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="lp-card">
              <span>Orders</span><strong>2,856</strong><em>▲ 8.7%</em>
              <div className="lp-bars">{[40, 65, 50, 80, 60, 95, 70].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <img src="/logo.png" alt="Inofex Restaurant" className="login-logo" />
          <h2 className="card-title-lg">Welcome back</h2>
          <p className="card-sub-lg">Sign in to manage your store</p>

          {error && <div className="login-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <Icon name="mail" size={18} />
                <input id="email" className="input" type="email" autoComplete="username" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="admin@yourdomain.com" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <Icon name="lock" size={18} />
                <input id="password" className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <label className="remember">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Keep me signed in for 7 days
            </label>

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in…</> : <>Sign in <Icon name="arrowRight" size={18} /></>}
            </button>
          </form>

          <p className="card-foot">Accounts lock for 15 minutes after 5 failed attempts.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
