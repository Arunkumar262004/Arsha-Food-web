import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../context/Storecontext';
import { assets } from '../../assets/assets';
import Icon from '../Icon';
import heroDish from '../../assets/hero_dish.jpg';
import './Login_popup.css';

const Login_popup = () => {
  const { url, setToken, setShowLogin } = useContext(StoreContext);

  const [method, setMethod] = useState('mobile'); // "mobile" (OTP) or "email" (password)
  const [currState, setCurrstate] = useState('Login'); // "Login" or "Sign Up"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mobile OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Email / password
  const [data, setData] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);

  const close = () => setShowLogin(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setError(''), [method, currState]);

  const onChangehandler = (e) => setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const finish = (token) => {
    setToken(token);
    localStorage.setItem('token', token);
    close();
  };

  // Demo OTP: generated and auto-filled in the browser (no SMS provider is wired up yet).
  const handleSendOtp = () => {
    if (phone.trim().length < 10) { setError('Enter a valid 10-digit mobile number.'); return; }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpValue(code);
    setOtp(code);
    setOtpSent(true);
    setError('');
  };

  const handleMobileLogin = async (e) => {
    e.preventDefault();
    if (!otpSent) { handleSendOtp(); return; }
    if (phone.trim().length < 10) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (otp !== otpValue) { setError('That code doesn’t match. Check the OTP and try again.'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${url}/api/user/mobile-login`, { phone: phone.trim(), name: data.name });
      if (res.data.success) finish(res.data.token);
      else setError(res.data.message || 'Could not sign you in.');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const endpoint = currState === 'Login' ? '/api/user/login' : '/api/user/register';
      const res = await axios.post(url + endpoint, data);
      if (res.data.success) finish(res.data.token);
      else setError(res.data.message || 'Something went wrong.');
    } catch (err) {
      setError(err.response?.data?.message || 'Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signUp = currState === 'Sign Up';

  return (
    <div className="lp-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="lp-card" role="dialog" aria-modal="true" aria-labelledby="lp-title">
        <aside className="lp-visual">
          <img src={heroDish} alt="" />
          <div className="lp-visual-shade" />
          <div className="lp-visual-body">
            <span className="lp-logo"><img src={assets.logo} alt="Arsha" /></span>
            <h3>Fresh food &amp; coffee, <em>delivered hot.</em></h3>
            <ul>
              <li><Icon name="tag" size={16} />Exclusive member coupons</li>
              <li><Icon name="truck" size={16} />Live order tracking</li>
              <li><Icon name="refresh" size={16} />One-tap reorder of favourites</li>
            </ul>
          </div>
        </aside>

        <div className="lp-main">
          <button className="lp-close" onClick={close} aria-label="Close"><Icon name="close" size={18} /></button>
          <h2 id="lp-title">{method === 'email' && signUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="lp-sub">Sign in to order, track deliveries and unlock offers.</p>

          <div className="lp-tabs" role="tablist">
            <button role="tab" aria-selected={method === 'mobile'} className={method === 'mobile' ? 'active' : ''} onClick={() => setMethod('mobile')}>
              <Icon name="phone" size={16} />Mobile OTP
            </button>
            <button role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}>
              <Icon name="mail" size={16} />Email
            </button>
            <span className="lp-tab-pill" style={{ transform: `translateX(${method === 'mobile' ? 0 : 100}%)` }} />
          </div>

          {method === 'mobile' ? (
            <form onSubmit={handleMobileLogin} className="lp-form" key="mobile">
              <div className="field">
                <label htmlFor="lp-phone">Mobile number</label>
                <div className="lp-phone">
                  <span>🇮🇳 +91</span>
                  <input id="lp-phone" type="tel" inputMode="numeric" maxLength={10} autoFocus value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setOtpSent(false); }}
                    placeholder="98765 43210" required />
                </div>
              </div>

              {otpSent && (
                <div className="lp-otp">
                  <div className="lp-note"><Icon name="check" size={15} />Demo mode — your code is <strong>{otpValue}</strong> (auto-filled).</div>
                  <div className="field">
                    <label htmlFor="lp-otp">4-digit code</label>
                    <input id="lp-otp" className="input lp-otp-input" inputMode="numeric" maxLength={4} value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <button type="button" className="lp-link" onClick={handleSendOtp}>Resend code</button>
                </div>
              )}

              {error && <div className="lp-error" role="alert">{error}</div>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || phone.length < 10}>
                {loading ? <span className="spinner" /> : null}
                {otpSent ? 'Verify & continue' : 'Get OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={onEmailLogin} className="lp-form" key="email">
              {signUp && (
                <div className="field">
                  <label htmlFor="lp-name">Full name</label>
                  <input id="lp-name" className="input" name="name" value={data.name} onChange={onChangehandler} placeholder="Your name" autoComplete="name" required />
                </div>
              )}
              <div className="field">
                <label htmlFor="lp-email">Email</label>
                <input id="lp-email" className="input" type="email" name="email" value={data.email} onChange={onChangehandler} placeholder="you@example.com" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="lp-pw">Password</label>
                <div className="lp-pw">
                  <input id="lp-pw" className="input" type={showPw ? 'text' : 'password'} name="password" value={data.password} onChange={onChangehandler}
                    placeholder={signUp ? 'At least 8 characters' : 'Your password'} autoComplete={signUp ? 'new-password' : 'current-password'} required />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              {error && <div className="lp-error" role="alert">{error}</div>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {signUp ? 'Create account' : 'Sign in'}
              </button>
              <p className="lp-switch">
                {signUp ? 'Already have an account?' : 'New to Arsha?'}{' '}
                <button type="button" className="lp-link" onClick={() => setCurrstate(signUp ? 'Login' : 'Sign Up')}>
                  {signUp ? 'Sign in' : 'Create an account'}
                </button>
              </p>
            </form>
          )}

          <p className="lp-terms">By continuing you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default Login_popup;
