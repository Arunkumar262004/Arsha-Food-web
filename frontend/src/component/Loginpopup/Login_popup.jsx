import React, { useState, useContext } from 'react';
import './Login_popup.css';
import { assets } from '../../assets/assets';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';

const Login_popup = () => {
  const { url, setToken, setShowLogin } = useContext(StoreContext);

  // Methods: "mobile" (Mobile OTP) or "email" (Email/Password)
  const [method, setMethod] = useState("mobile");
  const [currState, setCurrstate] = useState("Login"); // "Login" or "Sign Up"

  // Mobile OTP States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Email States
  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const onChangehandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // Generate & Auto-fill OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      // Generate a 4-digit random OTP
      const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setOtpValue(randomOtp);
      setOtp(randomOtp); // Auto-fill OTP field automatically as requested!
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      alert("Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // Mobile OTP Submit Login
  const handleMobileLogin = async (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!otp) {
      alert("Please enter OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${url}/api/user/mobile-login`, {
        phone: phone.trim(),
        name: data.name
      });

      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);
        setShowLogin(false);
      } else {
        alert(response.data.message || "Failed to log in");
      }
    } catch (err) {
      console.error("Mobile Login Error:", err);
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Email / Password Login Submit
  const onEmailLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    let newurl = url;
    if (currState === "Login") {
      newurl += "/api/user/login";
    } else {
      newurl += "/api/user/register";
    }

    try {
      const response = await axios.post(newurl, data);
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);
        setShowLogin(false);
      } else {
        alert(response.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-popup-overlay'>
      <div className="login-popup-card">
        {/* Header Title & Close Button */}
        <div className="login-popup-header">
          <div>
            <h2>Welcome to Arsha Food</h2>
            <p className="login-popup-sub">Sign in to place orders, track delivery & unlock offers.</p>
          </div>
          <button className="login-close-btn" onClick={() => setShowLogin(false)} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Method Toggle Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${method === 'mobile' ? 'active' : ''}`}
            onClick={() => setMethod('mobile')}
          >
            📱 Mobile OTP
          </button>
          <button
            type="button"
            className={`login-tab ${method === 'email' ? 'active' : ''}`}
            onClick={() => setMethod('email')}
          >
            ✉️ Email & Password
          </button>
        </div>

        {/* MOBILE OTP LOGIN FORM */}
        {method === 'mobile' ? (
          <form onSubmit={handleMobileLogin} className="login-popup-form">
            <div className="login-input-group">
              <label>Mobile Number</label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  required
                />
                {!otpSent ? (
                  <button
                    type="button"
                    className="get-otp-btn"
                    onClick={handleSendOtp}
                    disabled={phone.length < 10 || loading}
                  >
                    Get OTP
                  </button>
                ) : null}
              </div>
            </div>

            {/* OTP Section */}
            {otpSent && (
              <div className="otp-section">
                <div className="otp-alert-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>OTP Sent! Auto-filled for testing: <strong>{otpValue}</strong></span>
                </div>

                <div className="login-input-group">
                  <label>Enter 4-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP code"
                    className="otp-input"
                    required
                  />
                </div>
              </div>
            )}

            <div className="login-condition">
              <input type="checkbox" id="terms-mobile" defaultChecked required />
              <label htmlFor="terms-mobile">I agree to the Terms of Service & Privacy Policy</label>
            </div>

            <button type='submit' className="login-submit-btn" disabled={loading}>
              {loading ? "Processing..." : otpSent ? "Login & Continue" : "Send OTP & Login"}
            </button>
          </form>
        ) : (
          /* EMAIL & PASSWORD LOGIN FORM */
          <form onSubmit={onEmailLogin} className="login-popup-form">
            <div className="login-popp-inputs">
              {currState === "Sign Up" && (
                <div className="login-input-group">
                  <label>Your Full Name</label>
                  <input
                    name='name'
                    onChange={onChangehandler}
                    value={data.name}
                    type="text"
                    placeholder='Enter your full name'
                    required
                  />
                </div>
              )}

              <div className="login-input-group">
                <label>Email Address</label>
                <input
                  name='email'
                  onChange={onChangehandler}
                  value={data.email}
                  type="email"
                  placeholder='Enter your email address'
                  required
                />
              </div>

              <div className="login-input-group">
                <label>Password</label>
                <input
                  name='password'
                  onChange={onChangehandler}
                  value={data.password}
                  type="password"
                  placeholder='Enter password'
                  required
                />
              </div>
            </div>

            <div className="login-condition">
              <input type="checkbox" id="terms-email" defaultChecked required />
              <label htmlFor="terms-email">I agree to the Terms of Service & Privacy Policy</label>
            </div>

            <button type='submit' className="login-submit-btn" disabled={loading}>
              {loading ? "Processing..." : currState === "Sign Up" ? "Create Account" : "Login"}
            </button>

            <div className="login-switch-state">
              {currState === "Login" ? (
                <p>Don't have an account? <span onClick={() => setCurrstate("Sign Up")}>Create one here</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => setCurrstate("Login")}>Login here</span></p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login_popup;
