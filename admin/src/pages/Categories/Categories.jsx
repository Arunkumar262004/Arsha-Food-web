import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { number } from "../../lib/format";
import { PageHead, Modal, ConfirmDialog, Empty } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Categories.css";

const CategoryForm = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState({ name: initial?.name || "", description: initial?.description || "", isActive: initial?.isActive ?? true, imageUrl: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : f.imageUrl || (initial?.image ? imageSrc(initial.image) : "")), [file, f.imageUrl, initial]);
  useEffect(() => () => { if (file) URL.revokeObjectURL(preview); }, [file, preview]);
  const renaming = initial && f.name.trim() && f.name.trim() !== initial.name;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", f.name);
      fd.append("description", f.description);
      fd.append("isActive", f.isActive);
      if (f.imageUrl && !file) fd.append("imageUrl", f.imageUrl);
      if (file) fd.append("image", file);
      const r = initial ? await api.put(`/api/admin/categories/${initial._id}`, fd) : await api.post("/api/admin/categories", fd);
      toast.success(r.data.message);
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial ? `Edit ${initial.name}` : "New category"} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="cat-form" disabled={busy}>{busy && <span className="spinner" />}Save</button>
    </>}>
      <form id="cat-form" className="ct-form" onSubmit={submit}>
        <label className="ct-photo">
          {preview ? <img src={preview} alt="" /> : <span><Icon name="image" size={26} />Add a photo</span>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <em>{preview ? "Change photo" : "Upload"}</em>
        </label>
        <div className="field">
          <label htmlFor="ct-url">…or paste an image link</label>
          <input id="ct-url" className="input" placeholder="https://…" value={f.imageUrl} onChange={set("imageUrl")} disabled={!!file} />
        </div>
        <div className="field">
          <label htmlFor="ct-name">Name</label>
          <input id="ct-name" className="input" value={f.name} onChange={set("name")} required maxLength={40} placeholder="e.g. Biryani" />
          {renaming && initial.dishes > 0 && <span className="field-hint">All {initial.dishes} dishes in “{initial.name}” will move to “{f.name.trim()}”.</span>}
        </div>
        <div className="field">
          <label htmlFor="ct-desc">Short description (optional)</label>
          <textarea id="ct-desc" className="textarea" rows={2} value={f.description} onChange={set("description")} maxLength={200} />
        </div>
        <label className="ct-toggle">
          <span className="switch"><input type="checkbox" checked={f.isActive} onChange={set("isActive")} /><span /></span>
          <span><strong>Show on the storefront</strong><small>Hidden categories (and their dishes) don't appear in the menu filters.</small></span>
        </label>
      </form>
    </Modal>
  );
};

const Categories = () => {
  const { can } = useAuth();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/api/admin/categories").then((r) => setRows(r.data.data)).catch((err) => toast.error(errMsg(err, "Could not load categories")));
  useEffect(() => { load(); document.title = "Categories · Inofex Restaurant Admin"; }, []);

  const move = async (i, dir) => {
    const next = [...rows];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
    try { await api.put("/api/admin/categories/reorder", { ids: next.map((c) => c._id) }); }
    catch (err) { toast.error(errMsg(err)); load(); }
  };

  const toggle = async (c) => {
    try {
      const fd = new FormData();
      fd.append("isActive", !c.isActive);
      await api.put(`/api/admin/categories/${c._id}`, fd);
      setRows((rs) => rs.map((r) => (r._id === c._id ? { ...r, isActive: !c.isActive } : r)));
      toast.success(`${c.name} ${c.isActive ? "hidden" : "visible"} on the storefront`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/admin/categories/${deleting._id}`);
      toast.success("Category deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const dishes = rows?.reduce((s, c) => s + c.dishes, 0) || 0;
  return (
    <div className="page">
      <PageHead crumbs={["Catalog", "Categories"]} title="Categories"
        sub={rows ? `${rows.length} categories · ${number(dishes)} dishes. The order here is the order on your menu.` : "Group your menu."}>
        {can("products.create") && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />New category</button>}
      </PageHead>

      {!rows ? <div className="ct-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card skeleton" style={{ height: 250 }} />)}</div>
        : rows.length === 0 ? <div className="card"><Empty title="No categories yet">Create one, then add dishes to it.</Empty></div>
        : (
          <div className="ct-grid">
            {rows.map((c, i) => (
              <div key={c._id} className={`card ct-card ${c.isActive ? "" : "off"}`}>
                <div className="ct-img">
                  {c.image ? <img src={imageSrc(c.image)} alt="" loading="lazy" /> : <span><Icon name="image" size={28} /></span>}
                  <span className="ct-pos">{i + 1}</span>
                  {!c.isActive && <span className="badge ct-hidden">Hidden</span>}
                </div>
                <div className="ct-body">
                  <div className="ct-title">
                    <strong>{c.name}</strong>
                    {can("products.update") && (
                      <span className="switch" title={c.isActive ? "Visible on storefront" : "Hidden"}>
                        <input type="checkbox" checked={c.isActive} onChange={() => toggle(c)} aria-label={`Show ${c.name} on storefront`} /><span />
                      </span>
                    )}
                  </div>
                  <span className="muted ct-meta">
                    <Link to={`/products?category=${encodeURIComponent(c.name)}`}>{c.dishes} dish{c.dishes === 1 ? "" : "es"}</Link>
                    {c.dishes > c.available && <> · <span className="ct-sold">{c.dishes - c.available} sold out</span></>}
                  </span>
                  <div className="ct-actions">
                    {can("products.update") && <>
                      <button className="btn btn-ghost btn-sm btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier" title="Move earlier"><Icon name="arrowUp" size={15} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move later" title="Move later"><Icon name="arrowDown" size={15} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}><Icon name="edit" size={14} />Edit</button>
                    </>}
                    {can("products.delete") && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Icon name="trash" size={15} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {editing !== undefined && <CategoryForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
      {deleting && (
        <ConfirmDialog danger busy={busy} title={`Delete ${deleting.name}?`} confirmLabel="Delete"
          message={deleting.dishes ? `${deleting.dishes} dishes are still in this category, so it can't be deleted. Move them to another category first, or hide it instead.` : "This category has no dishes and will be removed."}
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Categories;
