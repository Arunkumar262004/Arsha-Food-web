import React, { useContext, useEffect, useState } from 'react';
import './Profile.css';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { url, token, user, setUser, fetchUserProfile, imageSrc, setShowLogin } = useContext(StoreContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('personal');

  // Personal Info Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState({ type: '', text: '' });

  // Address Form State
  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'India',
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState({ type: '', text: '' });

  // Security Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    document.title = "My Profile — Arsha Food";
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (!token) {
      setShowLogin(true);
      navigate('/');
    }
  }, [token, navigate, setShowLogin]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      if (user.avatar) {
        setAvatarPreview(imageSrc(user.avatar));
      }

      if (user.address) {
        setAddress({
          firstName: user.address.firstName || '',
          lastName: user.address.lastName || '',
          email: user.address.email || user.email || '',
          phone: user.address.phone || user.phone || '',
          street: user.address.street || '',
          city: user.address.city || '',
          state: user.address.state || '',
          zipcode: user.address.zipcode || '',
          country: user.address.country || 'India',
        });
      }
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPersonalMsg({ type: 'error', text: 'Image file size must be 5 MB or smaller.' });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setPersonalMsg({ type: '', text: '' });
    }
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    setPersonalMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('email', email);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await axios.post(`${url}/api/user/profile`, formData, {
        headers: {
          token,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setPersonalMsg({ type: 'success', text: 'Profile updated successfully!' });
        setUser(res.data.user);
        fetchUserProfile(token);
        setAvatarFile(null);
      } else {
        setPersonalMsg({ type: 'error', text: res.data.message || 'Error updating profile.' });
      }
    } catch (err) {
      setPersonalMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressMsg({ type: '', text: '' });

    try {
      const res = await axios.post(
        `${url}/api/user/profile`,
        { address },
        { headers: { token } }
      );

      if (res.data.success) {
        setAddressMsg({ type: 'success', text: 'Default shipping address saved successfully!' });
        setUser(res.data.user);
        fetchUserProfile(token);
      } else {
        setAddressMsg({ type: 'error', text: res.data.message || 'Error saving address.' });
      }
    } catch (err) {
      setAddressMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save address.' });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg({ type: '', text: '' });

    try {
      const res = await axios.post(
        `${url}/api/user/change-password`,
        { oldPassword, newPassword },
        { headers: { token } }
      );

      if (res.data.success) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: res.data.message || 'Error changing password.' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    return n.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="profile-page container">
      {/* HEADER BANNER */}
      <div className="profile-header-banner">
        <div className="profile-hero-info">
          <div className="profile-hero-avatar-wrap">
            {avatarPreview ? (
              <img src={avatarPreview} alt={name || "User"} className="profile-hero-avatar-img" />
            ) : (
              <div className="profile-hero-avatar-placeholder">{getInitials(name)}</div>
            )}
          </div>
          <div>
            <h2>{name || 'My Account'}</h2>
            <p>{email || 'Manage your account settings & default delivery addresses'}</p>
          </div>
        </div>

        <button className="my-orders-btn" onClick={() => navigate('/myorders')}>
          🧾 My Orders History →
        </button>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="profile-grid">
        {/* SIDEBAR TABS */}
        <div className="profile-tabs-sidebar card">
          <button
            className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Personal Details & Avatar
          </button>

          <button
            className={`profile-tab-btn ${activeTab === 'address' ? 'active' : ''}`}
            onClick={() => setActiveTab('address')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Saved Delivery Address
          </button>

          <button
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Security & Password
          </button>
        </div>

        {/* TAB PANELS */}
        <div className="profile-content-panel card">
          {/* TAB 1: PERSONAL DETAILS & AVATAR */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonal} className="profile-form">
              <h3>Personal Details & Profile Picture</h3>
              <p className="panel-sub">Upload your custom profile photo and update your contact information.</p>

              {personalMsg.text && (
                <div className={`profile-alert ${personalMsg.type}`}>
                  {personalMsg.text}
                </div>
              )}

              {/* AVATAR UPLOADER */}
              <div className="avatar-upload-box">
                <div className="avatar-preview-wrapper">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="avatar-preview-img" />
                  ) : (
                    <div className="avatar-preview-placeholder">{getInitials(name)}</div>
                  )}
                  <label htmlFor="avatar-file-input" className="avatar-edit-overlay" title="Upload new profile picture">
                    📷
                  </label>
                </div>

                <div className="avatar-upload-meta">
                  <label htmlFor="avatar-file-input" className="btn-upload-file">
                    Choose New Photo
                  </label>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <span className="upload-hint">JPG, PNG, WEBP or GIF. Max size 5 MB.</span>
                </div>
              </div>

              <div className="pf-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="pf-row">
                <div className="pf-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="pf-group">
                  <label>Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <button type="submit" className="btn-save-profile" disabled={savingPersonal}>
                {savingPersonal ? 'SAVING CHANGES…' : 'SAVE PROFILE CHANGES'}
              </button>
            </form>
          )}

          {/* TAB 2: DEFAULT SHIPPING ADDRESS */}
          {activeTab === 'address' && (
            <form onSubmit={handleSaveAddress} className="profile-form">
              <h3>Default Delivery Address</h3>
              <p className="panel-sub">Save your primary delivery address so checkout auto-fills every time.</p>

              {addressMsg.text && (
                <div className={`profile-alert ${addressMsg.type}`}>
                  {addressMsg.text}
                </div>
              )}

              <div className="pf-row">
                <div className="pf-group">
                  <label>Recipient First Name</label>
                  <input
                    type="text"
                    required
                    value={address.firstName}
                    onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                    placeholder="First name"
                  />
                </div>

                <div className="pf-group">
                  <label>Recipient Last Name</label>
                  <input
                    type="text"
                    required
                    value={address.lastName}
                    onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="pf-row">
                <div className="pf-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    required
                    value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="pf-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    placeholder="Mobile number"
                  />
                </div>
              </div>

              <div className="pf-group">
                <label>Street Address</label>
                <input
                  type="text"
                  required
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Flat No., House Name, Street, Area"
                />
              </div>

              <div className="pf-row">
                <div className="pf-group">
                  <label>City</label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="City"
                  />
                </div>

                <div className="pf-group">
                  <label>State</label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="pf-row">
                <div className="pf-group">
                  <label>Zipcode / Pincode</label>
                  <input
                    type="text"
                    required
                    value={address.zipcode}
                    onChange={(e) => setAddress({ ...address, zipcode: e.target.value })}
                    placeholder="Pincode"
                  />
                </div>

                <div className="pf-group">
                  <label>Country</label>
                  <input
                    type="text"
                    required
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>

              <button type="submit" className="btn-save-profile" disabled={savingAddress}>
                {savingAddress ? 'SAVING ADDRESS…' : 'SAVE DEFAULT ADDRESS'}
              </button>
            </form>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="profile-form">
              <h3>Security & Password</h3>
              <p className="panel-sub">Change your account password securely.</p>

              {passwordMsg.text && (
                <div className={`profile-alert ${passwordMsg.type}`}>
                  {passwordMsg.text}
                </div>
              )}

              <div className="pf-group">
                <label>Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="pf-group">
                <label>New Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="pf-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              <button type="submit" className="btn-save-profile" disabled={savingPassword}>
                {savingPassword ? 'UPDATING PASSWORD…' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
