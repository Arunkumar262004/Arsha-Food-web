import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { money, number, dateShort, dateTime } from "../../lib/format";
import { PageHead, Modal, ConfirmDialog, Empty, Segmented } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Coupons.css";

const EMPTY = {
  code: "", description: "", type: "percentage", value: "", maxDiscount: "", minOrderAmount: "",
  usageLimit: "", perCustomerLimit: "1", startsAt: "", expiresAt: "", firstOrderOnly: false,
  applicableCategories: [], applicableProducts: [], allowedCustomers: "", isActive: true,
};

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const offerLabel = (c) =>
  c.type === "percentage" ? `${c.value}% off${c.maxDiscount ? ` · max ${money(c.maxDiscount)}` : ""}`
    : c.type === "fixed" ? `${money(c.value)} off` : "Free delivery";

const couponState = (c) => {
  const now = Date.now();
  if (!c.isActive) return ["Inactive", ""];
  if (c.expiresAt && new Date(c.expiresAt) < now) return ["Expired", "badge-red"];
  if (c.startsAt && new Date(c.startsAt) > now) return ["Scheduled", "badge-purple"];
  if (c.usageLimit && c.usedCount >= c.usageLimit) return ["Used up", "badge-amber"];
  return ["Active", "badge-green"];
};

const ruleSummary = (c) => {
  const r = [];
  if (c.minOrderAmount) r.push(`Min ${money(c.minOrderAmount)}`);
  if (c.firstOrderOnly) r.push("First order");
  if (c.applicableCategories?.length) r.push(c.applicableCategories.join(", "));
  if (c.applicableProducts?.length) r.push(`${c.applicableProducts.length} product${c.applicableProducts.length > 1 ? "s" : ""}`);
  if (c.allowedCustomers?.length) r.push(`${c.allowedCustomers.length} customer${c.allowedCustomers.length > 1 ? "s" : ""}`);
  if (c.perCustomerLimit) r.push(`${c.perCustomerLimit}× per customer`);
  return r.length ? r.join(" · ") : "No conditions";
};

const CouponForm = ({ initial, foods, onClose, onSaved }) => {
  const [f, setF] = useState(() => initial ? {
    ...EMPTY, ...initial,
    value: initial.value ?? "", maxDiscount: initial.maxDiscount ?? "", minOrderAmount: initial.minOrderAmount || "",
    usageLimit: initial.usageLimit ?? "", perCustomerLimit: String(initial.perCustomerLimit ?? ""),
    startsAt: toInputDate(initial.startsAt), expiresAt: toInputDate(initial.expiresAt),
    allowedCustomers: (initial.allowedCustomers || []).join(", "),
  } : EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const toggleIn = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));
  const categories = useMemo(() => [...new Set(foods.map((x) => x.category))].sort(), [foods]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        ...f,
        // Dates are whole days in the store's timezone: valid from 00:00 on the start date to 23:59 on the expiry date.
        startsAt: f.startsAt ? new Date(`${f.startsAt}T00:00:00+05:30`).toISOString() : null,
        expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59+05:30`).toISOString() : null,
      };
      if (initial) await api.put(`/api/admin/coupons/${initial._id}`, body);
      else await api.post("/api/admin/coupons", body);
      toast.success(initial ? "Coupon updated" : "Coupon created");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title={initial ? `Edit ${initial.code}` : "New coupon"} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="coupon-form" disabled={busy}>{busy && <span className="spinner" />}Save coupon</button>
    </>}>
      <form id="coupon-form" className="cp-form" onSubmit={submit}>
        <section>
          <h4>Code & discount</h4>
          <div className="cp-grid">
            <div className="field">
              <label htmlFor="cp-code">Coupon code</label>
              <input id="cp-code" className="input cp-code" value={f.code} required maxLength={30} placeholder="WELCOME50"
                onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))} />
            </div>
            <div className="field">
              <label htmlFor="cp-desc">Description (internal)</label>
              <input id="cp-desc" className="input" value={f.description} onChange={set("description")} placeholder="Diwali campaign" />
            </div>
          </div>
          <div className="field">
            <label>Discount type</label>
            <Segmented value={f.type} onChange={(type) => setF((p) => ({ ...p, type }))} ariaLabel="Discount type" options={[
              { value: "percentage", label: "Percentage" }, { value: "fixed", label: "Fixed amount" }, { value: "free_shipping", label: "Free delivery" },
            ]} />
          </div>
          {f.type !== "free_shipping" && (
            <div className="cp-grid">
              <div className="field">
                <label htmlFor="cp-val">{f.type === "percentage" ? "Discount (%)" : "Discount (₹)"}</label>
                <input id="cp-val" className="input num" type="number" min="0" max={f.type === "percentage" ? 100 : undefined} step="0.01" required value={f.value} onChange={set("value")} />
              </div>
              {f.type === "percentage" && (
                <div className="field">
                  <label htmlFor="cp-max">Maximum discount (₹)</label>
                  <input id="cp-max" className="input num" type="number" min="0" step="0.01" value={f.maxDiscount} onChange={set("maxDiscount")} placeholder="No cap" />
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h4>Conditions</h4>
          <div className="cp-grid">
            <div className="field">
              <label htmlFor="cp-min">Minimum cart value (₹)</label>
              <input id="cp-min" className="input num" type="number" min="0" step="1" value={f.minOrderAmount} onChange={(e) => setF((p) => ({ ...p, minOrderAmount: e.target.value ? String(Math.round(Number(e.target.value))) : "" }))} placeholder="0 (No minimum)" />
              <div className="cp-presets" style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {[0, 199, 499, 999].map((val) => (
                  <button type="button" key={val} className="chip" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setF((p) => ({ ...p, minOrderAmount: String(val) }))}>
                    {val === 0 ? "No Min (₹0)" : `₹${val}`}
                  </button>
                ))}
              </div>
            </div>
            <label className="cp-check">
              <input type="checkbox" checked={f.firstOrderOnly} onChange={set("firstOrderOnly")} />
              <span><strong>First order only</strong><small>Customer has no paid orders yet</small></span>
            </label>
          </div>
          {categories.length > 0 && (
            <div className="field">
              <label>Only these categories <span className="muted">(none selected = whole menu)</span></label>
              <div className="cp-chips">
                {categories.map((c) => (
                  <button type="button" key={c} className={`chip ${f.applicableCategories.includes(c) ? "on" : ""}`} onClick={() => toggleIn("applicableCategories", c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label>Only these products <span className="muted">(optional)</span></label>
            <div className="cp-chips cp-products">
              {foods.map((p) => (
                <button type="button" key={p._id} className={`chip ${f.applicableProducts.includes(p._id) ? "on" : ""}`} onClick={() => toggleIn("applicableProducts", p._id)}>{p.name}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="cp-cust">Only these customers <span className="muted">(emails, comma separated; empty = everyone)</span></label>
            <textarea id="cp-cust" className="textarea" rows={2} value={f.allowedCustomers} onChange={set("allowedCustomers")} placeholder="asha@example.com, ravi@example.com" />
          </div>
        </section>

        <section>
          <h4>Limits & schedule</h4>
          <div className="cp-grid cp-grid-4">
            <div className="field">
              <label htmlFor="cp-ul">Total uses</label>
              <input id="cp-ul" className="input num" type="number" min="0" value={f.usageLimit} onChange={set("usageLimit")} placeholder="Unlimited" />
            </div>
            <div className="field">
              <label htmlFor="cp-pcl">Uses per customer</label>
              <input id="cp-pcl" className="input num" type="number" min="0" value={f.perCustomerLimit} onChange={set("perCustomerLimit")} placeholder="Unlimited" />
            </div>
            <div className="field">
              <label htmlFor="cp-start">Starts</label>
              <input id="cp-start" className="input" type="date" value={f.startsAt} onChange={set("startsAt")} />
            </div>
            <div className="field">
              <label htmlFor="cp-end">Expires</label>
              <input id="cp-end" className="input" type="date" value={f.expiresAt} min={f.startsAt || undefined} onChange={set("expiresAt")} />
            </div>
          </div>
          <label className="cp-check">
            <input type="checkbox" checked={f.isActive} onChange={set("isActive")} />
            <span><strong>Active</strong><small>Customers can use this code</small></span>
          </label>
        </section>
      </form>
    </Modal>
  );
};

const SendCampaign = ({ coupon, onClose }) => {
  const [audience, setAudience] = useState("all");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/api/admin/coupons/${coupon._id}/send`, { audience, emails });
      toast.success(r.data.message);
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Email ${coupon.code} to customers`} onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={send} disabled={busy || (audience === "emails" && !emails.trim())}>{busy && <span className="spinner" />}<Icon name="mail" size={16} />Send emails</button>
    </>}>
      <p className="muted">Uses the <strong>Coupon campaign</strong> email template. Delivery status appears in the email log.</p>
      <Segmented value={audience} onChange={setAudience} ariaLabel="Recipients" options={[
        { value: "all", label: coupon.allowedCustomers?.length ? "Allowed customers" : "All customers" },
        { value: "emails", label: "Specific emails" },
      ]} />
      {audience === "emails" && (
        <textarea className="textarea" rows={4} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="asha@example.com, ravi@example.com" aria-label="Recipient emails" />
      )}
    </Modal>
  );
};

const Usages = ({ coupon, onClose }) => {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/api/admin/coupons/${coupon._id}/usages`).then((r) => setRows(r.data.data)).catch((err) => { toast.error(errMsg(err)); setRows([]); });
  }, [coupon._id]);
  return (
    <Modal drawer title={`${coupon.code} · usage history`} onClose={onClose}>
      <div className="cp-usage-stats">
        <div><strong className="num">{number(coupon.usedCount)}</strong><span>times used</span></div>
        <div><strong className="num">{money(coupon.totalDiscount)}</strong><span>total discount given</span></div>
      </div>
      {rows === null ? <div className="skeleton" style={{ height: 120 }} /> : rows.length === 0 ? <Empty title="Not used yet" /> : (
        <table className="table">
          <thead><tr><th>Order</th><th>Customer</th><th className="right">Discount</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id}>
                <td><strong>{u.orderNumber}</strong><div className="muted" style={{ fontSize: 12 }}>{dateTime(u.usedAt)}</div></td>
                <td>{u.customer?.name || "—"}<div className="muted" style={{ fontSize: 12 }}>{u.customer?.email}</div></td>
                <td className="right num">{money(u.discount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
};

const Coupons = () => {
  const { can } = useAuth();
  const manage = can("coupons.manage");
  const [rows, setRows] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [usages, setUsages] = useState(null);
  const [sending, setSending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      const [c, f] = await Promise.all([api.get("/api/admin/coupons"), api.get("/api/food/list")]);
      setRows(c.data.data);
      setFoods(f.data.data || []);
    } catch (err) {
      toast.error(errMsg(err, "Could not load coupons"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); document.title = "Coupons · Inofex Restaurant Admin"; }, []);

  const filtered = rows.filter((c) => !q || c.code.includes(q.toUpperCase()) || c.description?.toLowerCase().includes(q.toLowerCase()));
  const active = rows.filter((c) => couponState(c)[0] === "Active").length;
  const redemptions = rows.reduce((s, c) => s + (c.usedCount || 0), 0);
  const given = rows.reduce((s, c) => s + (c.totalDiscount || 0), 0);

  const remove = async () => {
    setBusy(true);
    try {
      const r = await api.delete(`/api/admin/coupons/${deleting._id}`);
      toast.success(r.data.message);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/api/admin/coupons/${c._id}`, { isActive: !c.isActive });
      toast.success(`${c.code} ${c.isActive ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Marketing", "Coupons"]} title="Coupons" sub="Discount codes customers enter at checkout.">
        {manage && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />New coupon</button>}
      </PageHead>

      <div className="cp-stats">
        <div className="card cp-stat"><span>Active coupons</span><strong className="num">{number(active)}</strong></div>
        <div className="card cp-stat"><span>Times redeemed</span><strong className="num">{number(redemptions)}</strong></div>
        <div className="card cp-stat"><span>Discount given</span><strong className="num">{money(given)}</strong></div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 12 }}>
          <div className="search" style={{ maxWidth: 360 }}>
            <Icon name="search" size={18} />
            <input className="input" placeholder="Search coupons…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search coupons" />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Code</th><th>Offer</th><th>Rules</th><th>Used</th><th>Validity</th><th>Status</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {loading ? [0, 1, 2].map((i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>)
                : filtered.length === 0 ? <tr><td colSpan={7}><Empty title={rows.length ? "No coupons match" : "No coupons yet"}>{!rows.length && manage && "Create your first coupon code to offer discounts at checkout."}</Empty></td></tr>
                : filtered.map((c) => {
                  const [label, cls] = couponState(c);
                  return (
                    <tr key={c._id}>
                      <td><span className="cp-codetag">{c.code}</span>{c.description && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{c.description}</div>}</td>
                      <td><strong>{offerLabel(c)}</strong></td>
                      <td className="muted" style={{ fontSize: 13, maxWidth: 260 }}>{ruleSummary(c)}</td>
                      <td className="num">
                        <button className="link-btn" onClick={() => setUsages(c)}>{number(c.usedCount)}{c.usageLimit ? ` / ${number(c.usageLimit)}` : ""}</button>
                      </td>
                      <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                        {c.startsAt || c.expiresAt ? `${c.startsAt ? dateShort(c.startsAt) : "Now"} → ${c.expiresAt ? dateShort(c.expiresAt) : "No end"}` : "Always"}
                      </td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td className="right" style={{ whiteSpace: "nowrap" }}>
                        {manage && can("notifications.manage") && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Email to customers" aria-label={`Email ${c.code} to customers`} onClick={() => setSending(c)}><Icon name="mail" size={15} /></button>
                        )}
                        {manage && <>
                          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => toggleActive(c)}>{c.isActive ? "Deactivate" : "Activate"}</button>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 6 }} aria-label={`Edit ${c.code}`} onClick={() => setEditing(c)}><Icon name="edit" size={15} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 6 }} aria-label={`Delete ${c.code}`} onClick={() => setDeleting(c)}><Icon name="trash" size={15} /></button>
                        </>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined && <CouponForm initial={editing} foods={foods} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
      {usages && <Usages coupon={usages} onClose={() => setUsages(null)} />}
      {sending && <SendCampaign coupon={sending} onClose={() => setSending(null)} />}
      {deleting && (
        <ConfirmDialog danger busy={busy} title={`Delete ${deleting.code}?`} confirmLabel="Delete"
          message={deleting.usedCount ? "This coupon has been used, so it will be deactivated instead to keep order history." : "Customers will no longer be able to use this code."}
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Coupons;
