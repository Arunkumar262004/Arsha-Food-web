import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { PageHead, Modal, ConfirmDialog, Empty, Segmented } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Banners.css";

const COLORS = ["#b8322a", "#c9475f", "#e3a12b", "#5b3418", "#2f6b3a", "#1f3b5c", "#23150c"];

const EMPTY = {
  tag: "", title: "", subtitle: "", ctaLabel: "Order now", ctaLink: "/#menu", secondaryLabel: "", secondaryLink: "",
  bgColor: "#5b3418", bigText: "ARSHA", imageStyle: "cutout", food: "", isActive: true,
};

const isLight = (hex) => {
  const n = parseInt((hex || "#000000").slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 165;
};

// "Royal *dum* biryani" → <>Royal <em>dum</em> biryani</>
const Headline = ({ title }) => (
  <>{String(title || "").split("*").map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <React.Fragment key={i}>{part}</React.Fragment>))}</>
);

// Small version of the storefront hero, used in the list and as the live preview in the form.
const SlidePreview = ({ b, image, large }) => (
  <div className={`bn-preview ${large ? "large" : ""} ${isLight(b.bgColor) ? "light" : ""}`} style={{ background: b.bgColor }}>
    {b.bigText && <span className="bn-big">{b.bigText}</span>}
    <div className="bn-copy">
      {b.tag && <span className="bn-tag">{b.tag}</span>}
      <strong className="bn-title"><Headline title={b.title || "Your headline"} /></strong>
      {large && b.subtitle && <span className="bn-sub">{b.subtitle}</span>}
      {large && <span className="bn-btn">{b.ctaLabel || "Order now"} →</span>}
    </div>
    {image ? <img src={image} alt="" className={b.imageStyle === "photo" ? "photo" : ""} /> : <span className="bn-noimg"><Icon name="image" size={22} /></span>}
  </div>
);

const BannerForm = ({ initial, foods, onClose, onSaved }) => {
  const [f, setF] = useState(() => (initial ? { ...EMPTY, ...initial, food: initial.food?._id || initial.food || "" } : EMPTY));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : initial ? imageSrc(initial.image) : ""), [file, initial]);
  useEffect(() => () => { if (file) URL.revokeObjectURL(preview); }, [file, preview]);

  const submit = async (e) => {
    e.preventDefault();
    if (!initial && !file) { toast.error("Upload an image for the banner"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      for (const k of Object.keys(EMPTY)) fd.append(k, f[k] ?? "");
      if (file) fd.append("image", file);
      if (initial) await api.put(`/api/admin/banners/${initial._id}`, fd);
      else await api.post("/api/admin/banners", fd);
      toast.success(initial ? "Banner updated" : "Banner created");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title={initial ? "Edit banner" : "New banner"} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="banner-form" disabled={busy}>{busy && <span className="spinner" />}Save banner</button>
    </>}>
      <form id="banner-form" className="bn-form" onSubmit={submit}>
        <SlidePreview b={f} image={preview} large />

        <section>
          <h4>Image</h4>
          <label className="bn-drop">
            <input type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Icon name="upload" size={18} />
            <span>{file ? file.name : initial ? "Replace image" : "Choose an image"}<small>A transparent PNG or WebP cut-out looks best. Max 5 MB.</small></span>
          </label>
          <Segmented value={f.imageStyle} onChange={(v) => setF((p) => ({ ...p, imageStyle: v }))} ariaLabel="Image style" options={[
            { value: "cutout", label: "Cut-out (floats on colour)" },
            { value: "photo", label: "Photo (round frame)" },
          ]} />
        </section>

        <section>
          <h4>Text</h4>
          <div className="bn-grid">
            <div className="field"><label htmlFor="bn-tag">Small label</label><input id="bn-tag" className="input" value={f.tag} onChange={set("tag")} placeholder="Chef's special" maxLength={60} /></div>
            <div className="field"><label htmlFor="bn-big">Big background word</label><input id="bn-big" className="input" value={f.bigText} onChange={set("bigText")} placeholder="ARSHA" maxLength={16} /></div>
          </div>
          <div className="field">
            <label htmlFor="bn-title">Headline</label>
            <input id="bn-title" className="input" value={f.title} onChange={set("title")} required maxLength={120} placeholder="Royal *dum* biryani" />
            <span className="field-hint">Wrap words in *stars* to highlight them.</span>
          </div>
          <div className="field"><label htmlFor="bn-sub">Description</label><textarea id="bn-sub" className="textarea" rows={2} value={f.subtitle} onChange={set("subtitle")} maxLength={260} /></div>
        </section>

        <section>
          <h4>Buttons</h4>
          <div className="bn-grid">
            <div className="field"><label htmlFor="bn-cl">Main button</label><input id="bn-cl" className="input" value={f.ctaLabel} onChange={set("ctaLabel")} maxLength={30} /></div>
            <div className="field"><label htmlFor="bn-ck">Main button link</label><input id="bn-ck" className="input" value={f.ctaLink} onChange={set("ctaLink")} placeholder="/#menu" /></div>
            <div className="field"><label htmlFor="bn-sl">Second button (optional)</label><input id="bn-sl" className="input" value={f.secondaryLabel} onChange={set("secondaryLabel")} maxLength={30} /></div>
            <div className="field"><label htmlFor="bn-sk">Second button link</label><input id="bn-sk" className="input" value={f.secondaryLink} onChange={set("secondaryLink")} placeholder="https://wa.me/…" /></div>
          </div>
          <div className="field">
            <label htmlFor="bn-food">Feature a dish (optional)</label>
            <select id="bn-food" className="select" value={f.food} onChange={set("food")}>
              <option value="">No dish — just the banner</option>
              {foods.map((x) => <option key={x._id} value={x._id}>{x.name} · ₹{x.price}</option>)}
            </select>
            <span className="field-hint">Shows the dish's name, price and an Add button on the slide.</span>
          </div>
        </section>

        <section>
          <h4>Look</h4>
          <div className="bn-colors" role="radiogroup" aria-label="Background colour">
            {COLORS.map((c) => (
              <button type="button" key={c} role="radio" aria-checked={f.bgColor === c} aria-label={c}
                className={f.bgColor === c ? "on" : ""} style={{ background: c }} onClick={() => setF((p) => ({ ...p, bgColor: c }))} />
            ))}
            <label className="bn-custom">Custom<input type="color" value={f.bgColor} onChange={set("bgColor")} /></label>
          </div>
          <label className="bn-check"><input type="checkbox" checked={f.isActive} onChange={set("isActive")} /><span>Show on the home page</span></label>
        </section>
      </form>
    </Modal>
  );
};

const Banners = () => {
  const { can } = useAuth();
  const manage = can("content.manage");
  const [rows, setRows] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [b, f] = await Promise.all([api.get("/api/admin/banners"), api.get("/api/food/list")]);
      setRows(b.data.data);
      setFoods(f.data.data || []);
    } catch (err) {
      toast.error(errMsg(err, "Could not load banners"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); document.title = "Home Banners · Inofex Restaurant Admin"; }, []);

  const move = async (i, dir) => {
    const next = [...rows];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
    try {
      await api.put("/api/admin/banners/reorder", { ids: next.map((b) => b._id) });
    } catch (err) {
      toast.error(errMsg(err));
      load();
    }
  };

  const toggle = async (b) => {
    try {
      await api.put(`/api/admin/banners/${b._id}`, { isActive: !b.isActive });
      toast.success(b.isActive ? "Banner hidden" : "Banner is live");
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/admin/banners/${deleting._id}`);
      toast.success("Banner deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const live = rows.filter((b) => b.isActive).length;

  return (
    <div className="page">
      <PageHead crumbs={["Marketing", "Home Banners"]} title="Home Banners"
        sub={`Slides in the big banner at the top of the home page, shown in this order. ${live} live.`}>
        {manage && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />New banner</button>}
      </PageHead>

      {!loading && live === 0 && (
        <div className="bn-note"><Icon name="info" size={16} />No banners are live, so the storefront shows its built-in slides.</div>
      )}

      <div className="bn-list">
        {loading ? [0, 1, 2].map((i) => <div key={i} className="card skeleton" style={{ height: 120 }} />)
          : rows.length === 0 ? <div className="card"><Empty title="No banners yet">{manage && "Add a banner to feature a dish or offer at the top of the home page."}</Empty></div>
          : rows.map((b, i) => (
            <div key={b._id} className={`card bn-row ${b.isActive ? "" : "off"}`}>
              <span className="bn-pos num">{i + 1}</span>
              <SlidePreview b={b} image={imageSrc(b.image)} />
              <div className="bn-info">
                <strong><Headline title={b.title} /></strong>
                <span className="muted">{b.subtitle || "No description"}</span>
                <div className="bn-meta">
                  <span className={`badge ${b.isActive ? "badge-green" : ""}`}>{b.isActive ? "Live" : "Hidden"}</span>
                  {b.food?.name && <span className="badge"><Icon name="tag" size={12} />{b.food.name}</span>}
                  <span className="muted">Button: {b.ctaLabel} → {b.ctaLink}</span>
                </div>
              </div>
              {manage && (
                <div className="bn-actions">
                  <button className="btn btn-ghost btn-sm btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" title="Move up">
                    <Icon name="chevronDown" size={15} style={{ transform: "rotate(180deg)" }} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down" title="Move down">
                    <Icon name="chevronDown" size={15} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(b)}>{b.isActive ? "Hide" : "Show"}</button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(b)} aria-label="Edit banner"><Icon name="edit" size={15} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(b)} aria-label="Delete banner"><Icon name="trash" size={15} /></button>
                </div>
              )}
            </div>
          ))}
      </div>

      {editing !== undefined && <BannerForm initial={editing} foods={foods} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
      {deleting && (
        <ConfirmDialog danger busy={busy} title="Delete this banner?" confirmLabel="Delete"
          message="It will be removed from the home page and its image deleted. This can't be undone."
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Banners;
