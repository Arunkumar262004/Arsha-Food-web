import React, { useState } from "react";
import { toast } from "react-toastify";
import { Modal } from "../components/ui";
import { api, errMsg, tokenStore } from "../lib/api";

const ChangePassword = ({ onClose }) => {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const weak = form.newPassword && !(form.newPassword.length >= 8 && /[A-Za-z]/.test(form.newPassword) && /\d/.test(form.newPassword));
  const mismatch = form.confirm && form.confirm !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (weak || mismatch) return;
    setBusy(true);
    try {
      const r = await api.post("/api/admin/change-password", form);
      tokenStore.replace(r.data.token); // other sessions are signed out; keep this one
      toast.success("Password changed");
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Change password" onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
      <button className="btn btn-primary" form="pw-form" disabled={busy || weak || mismatch || !form.currentPassword}>
        {busy && <span className="spinner" />}Update password
      </button>
    </>}>
      <form id="pw-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label htmlFor="cp-cur">Current password</label>
          <input id="cp-cur" className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set("currentPassword")} required />
        </div>
        <div className="field">
          <label htmlFor="cp-new">New password</label>
          <input id="cp-new" className={`input ${weak ? "invalid" : ""}`} type="password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} required />
          {weak ? <span className="field-error">Use 8+ characters with letters and numbers.</span>
            : <span className="field-hint">Changing it signs you out on other devices.</span>}
        </div>
        <div className="field">
          <label htmlFor="cp-conf">Confirm new password</label>
          <input id="cp-conf" className={`input ${mismatch ? "invalid" : ""}`} type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
          {mismatch && <span className="field-error">Passwords don't match.</span>}
        </div>
      </form>
    </Modal>
  );
};

export default ChangePassword;
