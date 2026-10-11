import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, number, dateTime, timeAgo } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { PageHead, Modal, ConfirmDialog, Empty } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Sales.css";

const COLORS = ["#b8322a", "#d97a1e", "#c9475f", "#7a4a21", "#2f6b3a", "#1f3b5c", "#5b2a6e"];
const PRESETS = ["Diwali Sale", "Pongal Sale", "Christmas Sale", "New Year Sale", "Weekend Feast"];
const STATUS = {
  live: ["Live now", "badge-green"], scheduled: ["Scheduled", "badge-amber"], ended: ["Ended", ""], paused: ["Paused", "badge-red"],
};

// <input type="datetime-local"> works in the browser's local time.
const toLocalInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const pctOff = (price, sale) => (price > 0 && sale > 0 ? Math.round((1 - sale / price) * 100) : 0);

const SaleForm = ({ initial, foods, onClose, onSaved }) => {
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(10, 0, 0, 0);
  const [f, setF] = useState(() => ({
    name: initial?.name || "", tagline: initial?.tagline || "", description: initial?.description || "",
    themeColor: initial?.themeColor || COLORS[0], isActive: initial?.isActive ?? true,
    startsAt: toLocalInput(initial?.startsAt || tomorrow), endsAt: toLocalInput(initial?.endsAt || new Date(tomorrow.getTime() + 3 * 86400000)),
  }));
  const [items, setItems] = useState(() => (initial?.items || []).filter((i) => i.food).map((i) => ({ food: i.food._id || i.food, salePrice: String(i.salePrice) })));
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState("20");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const byId = useMemo(() => Object.fromEntries(foods.map((x) => [x._id, x])), [foods]);
  const chosen = new Set(items.map((i) => i.food));
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    return foods.filter((x) => !chosen.has(x._id) && (!n || x.name.toLowerCase().includes(n) || x.category.toLowerCase().includes(n))).slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods, q, items]);

  const add = (food) => setItems((it) => [...it, { food: food._id, salePrice: String(Math.max(1, Math.round(food.price * (1 - (Number(bulk) || 20) / 100)))) }]);
  const applyBulk = () => {
    const pct = Number(bulk);
    if (!(pct > 0 && pct < 100)) { toast.error("Enter a discount between 1 and 99%"); return; }
    setItems((it) => it.map((i) => ({ ...i, salePrice: String(Math.max(1, Math.round(byId[i.food].price * (1 - pct / 100)))) })));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(), items: items.map((i) => ({ food: i.food, salePrice: Number(i.salePrice) })) };
      const r = initial ? await api.put(`/api/admin/sales/${initial._id}`, body) : await api.post("/api/admin/sales", body);
      toast.success(r.data.message);
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title={initial ? `Edit ${initial.name}` : "New festival sale"} onClose={onClose} footer={<>
      <span className="sl-foot-note muted">{items.length} dish{items.length === 1 ? "" : "es"} in this sale</span>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" form="sale-form" disabled={busy}>{busy && <span className="spinner" />}Save sale</button>
    </>}>
      <form id="sale-form" className="sl-form" onSubmit={submit}>
        <div className="sl-preview" style={{ "--c": f.themeColor }}>
          <span className="sl-preview-tag"><Icon name="clock" size={13} />Starts {f.startsAt ? new Date(f.startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "…"}</span>
          <strong>{f.name || "Your sale name"}</strong>
          <span>{f.tagline || "A short line that makes people want to come back"}</span>
        </div>

        <section>
          <h4>Sale details</h4>
          <div className="field">
            <label htmlFor="sl-name">Sale name</label>
            <input id="sl-name" className="input" value={f.name} onChange={set("name")} required maxLength={60} placeholder="e.g. Diwali Sale" />
            {!initial && (
              <div className="sl-presets">{PRESETS.map((p) => <button type="button" key={p} className="chip" onClick={() => setF((x) => ({ ...x, name: p }))}>{p}</button>)}</div>
            )}
          </div>
          <div className="field"><label htmlFor="sl-tag">Tagline</label><input id="sl-tag" className="input" value={f.tagline} onChange={set("tagline")} maxLength={100} placeholder="Festive feasts at festive prices" /></div>
          <div className="sl-grid">
            <div className="field"><label htmlFor="sl-start">Starts</label><input id="sl-start" type="datetime-local" className="input" value={f.startsAt} onChange={set("startsAt")} required /></div>
            <div className="field"><label htmlFor="sl-end">Ends</label><input id="sl-end" type="datetime-local" className="input" value={f.endsAt} min={f.startsAt} onChange={set("endsAt")} required /></div>
          </div>
          <span className="field-hint">Before it starts, customers see the dishes locked and can leave their mobile and email. When it starts, they're emailed automatically and the sale prices apply at checkout.</span>
          <div className="sl-colors" role="radiogroup" aria-label="Colour">
            <span className="muted">Colour</span>
            {COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={f.themeColor === c} className={f.themeColor === c ? "on" : ""} style={{ background: c }} onClick={() => setF((x) => ({ ...x, themeColor: c }))} aria-label={c} />)}
          </div>
        </section>

        <section>
          <h4>Dishes and sale prices</h4>
          {items.length > 0 && (
            <div className="sl-bulk">
              <span>Set all to</span>
              <input className="input" type="number" min="1" max="99" value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Discount percent" />
              <span>% off</span>
              <button type="button" className="btn btn-soft btn-sm" onClick={applyBulk}>Apply</button>
            </div>
          )}
          {items.length === 0 ? <p className="muted sl-empty">No dishes yet — search below and add the ones going on sale.</p> : (
            <div className="sl-items">
              {items.map((i, idx) => {
                const food = byId[i.food];
                if (!food) return null;
                const pct = pctOff(food.price, Number(i.salePrice));
                const bad = !(Number(i.salePrice) > 0) || Number(i.salePrice) >= food.price;
                return (
                  <div key={i.food} className="sl-item">
                    <img src={imageSrc(food.image)} alt="" />
                    <div className="sl-item-name"><strong>{food.name}</strong><small>{food.category} · regular {money(food.price)}</small></div>
                    <div className={`sl-price ${bad ? "bad" : ""}`}>
                      <span>₹</span>
                      <input type="number" min="1" step="1" value={i.salePrice} aria-label={`Sale price for ${food.name}`}
                        onChange={(e) => setItems((it) => it.map((x, j) => (j === idx ? { ...x, salePrice: e.target.value } : x)))} />
                    </div>
                    <span className={`badge ${bad ? "badge-red" : "badge-green"}`}>{bad ? "Too high" : `${pct}% off`}</span>
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setItems((it) => it.filter((_, j) => j !== idx))} aria-label={`Remove ${food.name}`}><Icon name="close" size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search dishes to add…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" /></div>
          <div className="pf-results">
            {results.map((x) => (
              <button type="button" key={x._id} className="pf-result" onClick={() => add(x)}>
                <img src={imageSrc(x.image)} alt="" /><span><strong>{x.name}</strong><small>{x.category} · {money(x.price)}</small></span><Icon name="plus" size={16} />
              </button>
            ))}
          </div>
        </section>

        <label className="ct-toggle">
          <span className="switch"><input type="checkbox" checked={f.isActive} onChange={set("isActive")} /><span /></span>
          <span><strong>Sale is on</strong><small>Switch off to hide the sale and stop charging sale prices.</small></span>
        </label>
      </form>
    </Modal>
  );
};

const Signups = ({ sale, onClose }) => {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/api/admin/sales/${sale._id}/signups`).then((r) => setRows(r.data.data)).catch((err) => { toast.error(errMsg(err)); setRows([]); });
  }, [sale._id]);
  return (
    <Modal drawer title={`${sale.name} · waiting list`} onClose={onClose}>
      <div className="cp-usage-stats">
        <div><strong className="num">{number(sale.signups)}</strong><span>signed up</span></div>
        <div><strong className="num">{number(sale.notified)}</strong><span>emailed that it's live</span></div>
      </div>
      {rows?.length > 0 && (
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}
          onClick={() => downloadCsv(`${sale.name.replace(/\W+/g, "-").toLowerCase()}-signups.csv`, ["Name", "Email", "Mobile", "Signed up", "Emailed"],
            rows.map((r) => [r.name, r.email, r.phone, dateTime(r.createdAt), r.notifiedAt ? dateTime(r.notifiedAt) : ""]))}>
          <Icon name="download" size={14} />Export CSV
        </button>
      )}
      {rows === null ? <div className="skeleton" style={{ height: 160 }} /> : rows.length === 0 ? <Empty title="No one yet">Sign-ups from the locked sale on your home page appear here.</Empty> : (
        <table className="table">
          <thead><tr><th>Customer</th><th>Mobile</th><th>Emailed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td><strong>{r.name || "—"}</strong><div className="muted" style={{ fontSize: 12.5 }}>{r.email}</div></td>
                <td className="num"><a href={`tel:+91${r.phone}`}>{r.phone}</a></td>
                <td>{r.notifiedAt ? <span className="badge badge-green">{timeAgo(r.notifiedAt)}</span> : <span className="muted">Not yet</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
};

const Sales = () => {
  const { can } = useAuth();
  const manage = can("coupons.manage");
  const [rows, setRows] = useState(null);
  const [foods, setFoods] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api.get("/api/admin/sales"), api.get("/api/food/list")])
    .then(([s, f]) => { setRows(s.data.data); setFoods(f.data.data || []); })
    .catch((err) => toast.error(errMsg(err, "Could not load sales")));
  useEffect(() => { load(); document.title = "Festival Sales · Inofex Restaurant Admin"; }, []);

  const act = async (fn) => { try { const r = await fn(); toast.success(r.data.message); load(); } catch (err) { toast.error(errMsg(err)); } };
  const remove = async () => {
    setBusy(true);
    await act(() => api.delete(`/api/admin/sales/${deleting._id}`));
    setBusy(false); setDeleting(null);
  };

  return (
    <div className="page">
      <PageHead crumbs={["Marketing", "Festival Sales"]} title="Festival Sales"
        sub="Limited-time prices for Diwali, Pongal and other occasions. Customers see the dishes locked until the sale starts.">
        {manage && <button className="btn btn-primary" onClick={() => setEditing(null)}><Icon name="plus" size={18} />New sale</button>}
      </PageHead>

      {!rows ? <div className="card skeleton" style={{ height: 200 }} />
        : rows.length === 0 ? (
          <div className="card"><Empty title="No sales yet">{manage && "Create a Diwali or Pongal sale: pick dishes, set lower prices and a start date. Customers can sign up to be emailed when it opens."}</Empty></div>
        ) : (
          <div className="sl-list">
            {rows.map((s) => {
              const [label, cls] = STATUS[s.status];
              const items = s.items.filter((i) => i.food);
              const maxOff = Math.max(0, ...items.map((i) => pctOff(i.food.price, i.salePrice)));
              return (
                <article key={s._id} className={`card sl-card is-${s.status}`} style={{ "--c": s.themeColor }}>
                  <div className="sl-card-band">
                    <div>
                      <span className={`badge ${cls}`}><span className="dot" />{label}</span>
                      <h3>{s.name}</h3>
                      {s.tagline && <p>{s.tagline}</p>}
                    </div>
                    {maxOff > 0 && <span className="sl-off">up to <strong>{maxOff}%</strong> off</span>}
                  </div>
                  <div className="sl-card-body">
                    <div className="sl-when"><Icon name="clock" size={15} />{dateTime(s.startsAt)} → {dateTime(s.endsAt)}</div>
                    <div className="sl-thumbs">
                      {items.slice(0, 6).map((i) => <img key={i.food._id} src={imageSrc(i.food.image)} alt={i.food.name} title={`${i.food.name}: ${money(i.salePrice)} (was ${money(i.food.price)})`} />)}
                      {items.length > 6 && <span>+{items.length - 6}</span>}
                    </div>
                    <div className="sl-stats">
                      <div><strong className="num">{items.length}</strong><span>dishes</span></div>
                      <button className="sl-stat-btn" onClick={() => setList(s)}><strong className="num">{number(s.signups)}</strong><span>waiting list →</span></button>
                      <div><strong className="num">{number(s.notified)}</strong><span>emailed</span></div>
                    </div>
                    {manage && (
                      <div className="sl-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}><Icon name="edit" size={14} />Edit</button>
                        {s.status !== "ended" && <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.put(`/api/admin/sales/${s._id}`, { isActive: !s.isActive }))}>{s.isActive ? "Pause" : "Resume"}</button>}
                        {s.status === "live" && s.signups > s.notified && can("notifications.manage") && (
                          <button className="btn btn-soft btn-sm" onClick={() => act(() => api.post(`/api/admin/sales/${s._id}/send`))}><Icon name="send" size={14} />Email {s.signups - s.notified} now</button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: "auto" }} onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}><Icon name="trash" size={14} /></button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {editing !== undefined && <SaleForm initial={editing} foods={foods} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
      {list && <Signups sale={list} onClose={() => setList(null)} />}
      {deleting && (
        <ConfirmDialog danger busy={busy} title={`Delete ${deleting.name}?`} confirmLabel="Delete"
          message={`The sale and its waiting list (${deleting.signups} people) will be removed.${deleting.status === "live" ? " Prices go back to normal immediately." : ""}`}
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Sales;
