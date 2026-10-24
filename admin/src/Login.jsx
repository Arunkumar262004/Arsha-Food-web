import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import { api, errMsg } from './lib/api';
import Icon from './components/Icon';
import './Login.css';
import loginBg from './assets/login-bg.webp';

const Login = () => {
  const { login, demoLogin } = useAuth();
  const [demoOn, setDemoOn] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  useEffect(() => { api.get('/api/admin/demo').then((r) => setDemoOn(!!r.data.enabled)).catch(() => {}); }, []);

  const tryDemo = async () => {
    setError(''); setDemoBusy(true);
    try {
      await demoLogin();
      toast.info('You are exploring a read-only demo. Customer details are hidden.');
    } catch (err) {
      setError(errMsg(err, 'The demo is not available right now.'));
    } finally {
      setDemoBusy(false);
    }
  };
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
      <img className="login-photo" src={loginBg} alt="" />
      <div className="login-shade" />
      <div className="login-left">
        <div className="left-inner">
          <div className="left-brand"><span><img src="/logo.png" alt="" /></span>Inofex Restaurant</div>
          <div className="left-copy">
            <div className="left-badge"><span className="dot" />Admin console</div>
            <h1 className="left-headline">Your kitchen,<br />your menu, <em>one place.</em></h1>
            <p className="left-desc">Take orders, update the menu, run offers and see how the day is going — from any device.</p>
            <ul className="left-points">
              <li><Icon name="bag" size={18} />Live orders and payments</li>
              <li><Icon name="box" size={18} />Menu, categories and stock</li>
              <li><Icon name="tag" size={18} />Coupons, banners and newsletters</li>
              <li><Icon name="chart" size={18} />Reports you can export</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <img src="/logo.png" alt="Inofex Restaurant" className="login-logo" />
          <span className="login-kicker">Staff sign-in</span>
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

          {demoOn && (
            <>
              <div className="demo-or"><span>or</span></div>
              <button type="button" className="demo-btn" onClick={tryDemo} disabled={demoBusy || loading}>
                {demoBusy ? <span className="spinner" /> : <Icon name="eye" size={18} />}
                <span><strong>Explore the demo</strong><small>Look around every page — read-only, no sign-in needed</small></span>
                <Icon name="arrowRight" size={18} />
              </button>
            </>
          )}

          <p className="card-foot">Accounts lock for 15 minutes after 5 failed attempts.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
