import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { PageHead, Modal, ConfirmDialog } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Roles.css";

const ACTION_LABEL = { view: "View", create: "Create", update: "Edit", delete: "Delete", manage: "Manage" };
const permLabel = (p) => {
  const act = p.split(".")[1];
  return ACTION_LABEL[act] || act;
};

const RoleEditor = ({ role, groups, onClose, onSaved }) => {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [perms, setPerms] = useState(new Set(role?.permissions || []));
  const [busy, setBusy] = useState(false);

  const toggle = (p) => setPerms((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });
  const toggleGroup = (list) => setPerms((s) => {
    const n = new Set(s); const all = list.every((p) => n.has(p));
    list.forEach((p) => (all ? n.delete(p) : n.add(p))); return n;
  });

  const save = async () => {
    setBusy(true);
    try {
      const body = { name, description, permissions: [...perms] };
      if (role) await api.put(`/api/admin/roles/${role._id}`, body);
      else await api.post("/api/admin/roles", body);
      toast.success(role ? "Role updated" : "Role created");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title={role ? `Edit role · ${role.name}` : "New role"} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={save} disabled={busy || !name.trim()}>{busy && <span className="spinner" />}Save role</button>
    </>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div className="field"><label htmlFor="r-name">Role name</label>
          <input id="r-name" className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={role?.isSystem} /></div>
        <div className="field"><label htmlFor="r-desc">Description</label>
          <input id="r-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>
      <div className="perm-grid">
        {Object.entries(groups).map(([group, list]) => {
          const on = list.filter((p) => perms.has(p)).length;
          return (
            <div key={group} className="perm-group">
              <label className="perm-group-head">
                <input type="checkbox" checked={on === list.length} ref={(el) => el && (el.indeterminate = on > 0 && on < list.length)}
                  onChange={() => toggleGroup(list)} />
                <strong>{group}</strong>
                <span className="muted">{on}/{list.length}</span>
              </label>
              <div className="perm-list">
                {list.map((p) => (
                  <label key={p} className={`perm-chip ${perms.has(p) ? "on" : ""}`}>
                    <input type="checkbox" checked={perms.has(p)} onChange={() => toggle(p)} />
                    {group === "Administration" ? p.replace(".", " · ") : permLabel(p)}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

const Roles = () => {
  const { can } = useAuth();
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState({});
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const manage = can("roles.manage");
  const total = Object.values(groups).flat().length;

  const load = async () => {
    try {
      const [r, p] = await Promise.all([api.get("/api/admin/roles"), api.get("/api/admin/permissions")]);
      setRoles(r.data.data);
      setGroups(p.data.data);
    } catch (err) {
      toast.error(errMsg(err, "Could not load roles"));
    }
  };
  useEffect(() => { load(); document.title = "Roles · Inofex Restaurant Admin"; }, []);

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/admin/roles/${deleting._id}`);
      toast.success("Role deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Administration", "Roles & permissions"]} title="Roles & permissions" sub="Control what each admin can see and do.">
        {manage && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />New role</button>}
      </PageHead>

      <div className="role-grid">
        {roles.map((r) => {
          const full = r.permissions.includes("*");
          const n = full ? total : r.permissions.length;
          return (
            <div className="card card-pad role-card" key={r._id}>
              <div className="role-top">
                <div className="role-icon"><Icon name="shield" size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{r.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{r.adminCount} admin{r.adminCount === 1 ? "" : "s"}{r.isSystem ? " · built-in" : ""}</div>
                </div>
              </div>
              {r.description && <p className="muted" style={{ fontSize: 13 }}>{r.description}</p>}
              <div className="role-meter" aria-label={`${n} of ${total} permissions`}>
                <span style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{full ? "Full access to everything" : `${n} of ${total} permissions`}</div>
              {manage && !full && (
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button className="btn btn-soft btn-sm" onClick={() => setEditing(r)}><Icon name="edit" size={15} />Edit permissions</button>
                  {!r.isSystem && <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(r)}><Icon name="trash" size={15} /></button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing !== undefined && (
        <RoleEditor role={editing} groups={groups} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />
      )}
      {deleting && (
        <ConfirmDialog danger busy={busy} title="Delete role?" confirmLabel="Delete"
          message={`“${deleting.name}” will be deleted. Roles that are still assigned to admins can't be deleted.`}
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Roles;
