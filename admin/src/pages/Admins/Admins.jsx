import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { dateTime, timeAgo } from "../../lib/format";
import { PageHead, Modal, ConfirmDialog, Empty } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";

const strong = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const AdminForm = ({ initial, roles, onClose, onSaved }) => {
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "", email: initial?.email || "", password: "",
    roleId: initial?.role?.id || roles.find((r) => r.slug === "manager")?._id || roles[0]?._id || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pwBad = form.password && !strong(form.password);

  const submit = async (e) => {
    e.preventDefault();
    if (pwBad || (!editing && !form.password)) return;
    setBusy(true);
    try {
      if (editing) {
        const body = { name: form.name };
        if (form.roleId !== initial.role?.id) body.roleId = form.roleId;
        if (form.password) body.password = form.password;
        await api.put(`/api/admin/users/${initial.id}`, body);
      } else {
        await api.post("/api/admin/users", form);
      }
      toast.success(editing ? "Admin updated" : "Admin created");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${initial.name}` : "Invite admin"} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="admin-form" disabled={busy || pwBad}>{busy && <span className="spinner" />}{editing ? "Save changes" : "Create admin"}</button>
    </>}>
      <form id="admin-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field"><label htmlFor="a-name">Full name</label>
          <input id="a-name" className="input" value={form.name} onChange={set("name")} required /></div>
        <div className="field"><label htmlFor="a-email">Email</label>
          <input id="a-email" className="input" type="email" value={form.email} onChange={set("email")} required disabled={editing} /></div>
        <div className="field"><label htmlFor="a-role">Role</label>
          <select id="a-role" className="select" value={form.roleId} onChange={set("roleId")}>
            {roles.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select></div>
        <div className="field"><label htmlFor="a-pw">{editing ? "Reset password (optional)" : "Temporary password"}</label>
          <input id="a-pw" className={`input ${pwBad ? "invalid" : ""}`} type="password" autoComplete="new-password"
            value={form.password} onChange={set("password")} required={!editing} />
          {pwBad ? <span className="field-error">Use 8+ characters with letters and numbers.</span>
            : <span className="field-hint">{editing ? "Setting a new password signs them out everywhere." : "Share it securely; they can change it after signing in."}</span>}
        </div>
      </form>
    </Modal>
  );
};

const Admins = () => {
  const { can, admin: me } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);
  const manage = can("admins.manage");

  const load = async () => {
    try {
      const [a, r] = await Promise.all([
        api.get("/api/admin/users"),
        can("roles.view") ? api.get("/api/admin/roles") : Promise.resolve({ data: { data: [] } }),
      ]);
      setAdmins(a.data.data);
      setRoles(r.data.data);
    } catch (err) {
      toast.error(errMsg(err, "Could not load admins"));
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); document.title = "Admin users · Inofex Restaurant Admin"; }, []);

  const update = async (a, body, msg) => {
    setBusy(true);
    try {
      await api.put(`/api/admin/users/${a.id}`, body);
      toast.success(msg);
      setToggle(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Administration", "Admin users"]} title="Admin users" sub="People who can sign in to this console.">
        {manage && roles.length > 0 && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />Invite admin</button>}
      </PageHead>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Admin</th><th>Role</th><th>Status</th><th>Last login</th>{manage && <th className="right">Actions</th>}</tr></thead>
            <tbody>
              {loading ? [0, 1, 2].map((i) => <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: 40 }} /></td></tr>)
                : admins.length === 0 ? <tr><td colSpan={5}><Empty title="No admins" /></td></tr>
                : admins.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="avatar avatar-sm">{a.name?.[0]?.toUpperCase() || "A"}</div>
                        <div><strong>{a.name}</strong>{a.id === me.id && <span className="badge" style={{ marginLeft: 8 }}>You</span>}
                          <div className="muted" style={{ fontSize: 12 }}>{a.email}</div></div>
                      </div>
                    </td>
                    <td><span className={`badge ${a.role?.slug === "super-admin" ? "badge-purple" : "badge-blue"}`}>{a.role?.name || "No role"}</span></td>
                    <td>
                      {a.locked ? <span className="badge badge-amber">Locked</span>
                        : a.isActive ? <span className="badge badge-green"><span className="dot" />Active</span>
                        : <span className="badge badge-red">Inactive</span>}
                    </td>
                    <td className="muted" title={a.lastLoginAt ? `${dateTime(a.lastLoginAt)}${a.lastLoginIp ? ` from ${a.lastLoginIp}` : ""}` : ""}>{timeAgo(a.lastLoginAt)}</td>
                    {manage && (
                      <td className="right" style={{ whiteSpace: "nowrap" }}>
                        {a.locked && <button className="btn btn-soft btn-sm" style={{ marginRight: 6 }} onClick={() => update(a, { unlock: true }, "Account unlocked")}>Unlock</button>}
                        <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => setEditing(a)} disabled={!roles.length}><Icon name="edit" size={15} />Edit</button>
                        {a.id !== me.id && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setToggle(a)}>{a.isActive ? "Deactivate" : "Activate"}</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined && (
        <AdminForm initial={editing} roles={roles} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      )}
      {toggle && (
        <ConfirmDialog danger={toggle.isActive} busy={busy}
          title={toggle.isActive ? "Deactivate admin?" : "Activate admin?"}
          confirmLabel={toggle.isActive ? "Deactivate" : "Activate"}
          message={toggle.isActive ? `${toggle.name} will be signed out and won't be able to sign in until reactivated.` : `${toggle.name} will be able to sign in again.`}
          onConfirm={() => update(toggle, { isActive: !toggle.isActive }, toggle.isActive ? "Admin deactivated" : "Admin activated")}
          onClose={() => !busy && setToggle(null)} />
      )}
    </div>
  );
};

export default Admins;
