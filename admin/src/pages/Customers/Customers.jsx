import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, number, dateShort, timeAgo } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { PageHead, Modal, Empty, StatusBadge } from "../../components/ui";
import Icon from "../../components/Icon";
import "./Customers.css";

const SEGMENTS = [
  ["all", "All"], ["buyers", "Paying"], ["repeat", "Repeat"], ["new", "Joined in 30 days"], ["inactive", "Inactive 30+ days"], ["never", "Never ordered"],
];
const initials = (n = "") => n.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

const CustomerDrawer = ({ id, onClose }) => {
  const [c, setC] = useState(null);
  useEffect(() => {
    api.get(`/api/admin/customers/${id}`).then((r) => setC(r.data.data)).catch((err) => { toast.error(errMsg(err)); onClose(); });
  // Load once per customer; onClose is a fresh function on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const a = c?.address || {};
  const address = [a.street, a.city, a.state, a.zipcode].filter(Boolean).join(", ");

  return (
    <Modal drawer title="Customer" onClose={onClose}>
      {!c ? <div className="skeleton" style={{ height: 320 }} /> : (
        <div className="cu-detail">
          <div className="cu-hero">
            <div className="cu-avatar lg">{c.avatar ? <img src={imageSrc(c.avatar)} alt="" /> : initials(c.name)}</div>
            <div>
              <h4>{c.name}</h4>
              <span className="muted">Customer since {dateShort(c.joined)}</span>
            </div>
          </div>

          <div className="cu-contact">
            <a href={`mailto:${c.email}`}><Icon name="mail" size={16} />{c.email}</a>
            {(c.phone || a.phone) && <a href={`tel:${c.phone || a.phone}`}><Icon name="phone" size={16} />{c.phone || a.phone}</a>}
            {address && <span><Icon name="mapPin" size={16} />{address}</span>}
          </div>

          <div className="cu-stats">
            <div><strong className="num">{money(c.stats.spent)}</strong><span>Total spent</span></div>
            <div><strong className="num">{number(c.stats.paidOrders)}</strong><span>Paid orders</span></div>
            <div><strong className="num">{money(c.stats.avgOrder)}</strong><span>Avg. order</span></div>
            <div><strong className="num">{number(c.stats.cartItems)}</strong><span>In cart now</span></div>
          </div>

          {c.favourites.length > 0 && (
            <section>
              <h5>Favourite dishes</h5>
              <div className="cu-favs">
                {c.favourites.map((f) => (
                  <span key={f.name} className="cu-fav">
                    {f.image && <img src={imageSrc(f.image)} alt="" />}{f.name}<small>×{f.quantity}</small>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h5>Orders ({c.orders.length})</h5>
            {c.orders.length === 0 ? <p className="muted">No orders yet.</p> : (
              <div className="cu-orders">
                {c.orders.map((o) => (
                  <Link key={o._id} to={`/orders/${o._id}`} className="cu-order">
                    <div>
                      <strong>{o.orderNumber || `#${o._id.slice(-6).toUpperCase()}`}</strong>
                      <small>{dateShort(o.date)} · {o.items?.length || 0} item{o.items?.length === 1 ? "" : "s"}{o.couponCode ? ` · ${o.couponCode}` : ""}</small>
                    </div>
                    <StatusBadge status={o.status} />
                    <strong className="num">{money(o.amount)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};

const Customers = () => {
  const [data, setData] = useState(null);
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  useEffect(() => { document.title = "Customers · Inofex Restaurant Admin"; }, []);
  useEffect(() => { setPage(1); }, [segment, sort, q]);
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/api/admin/customers", { params: { segment, sort, q, page } })
        .then((r) => setData(r.data)).catch((err) => toast.error(errMsg(err, "Could not load customers")));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [segment, sort, q, page]);

  const exportCsv = async () => {
    try {
      const all = [];
      for (let p = 1; ; p++) {
        const r = await api.get("/api/admin/customers", { params: { segment, sort, q, page: p } });
        all.push(...r.data.data);
        if (p >= r.data.pages) break;
      }
      downloadCsv(`customers-${segment}.csv`, ["Name", "Email", "Phone", "City", "Joined", "Orders", "Paid orders", "Total spent", "Last order"],
        all.map((c) => [c.name, c.email, c.phone, c.city, dateShort(c.joined), c.orders, c.paidOrders, c.spent, c.lastOrder ? dateShort(c.lastOrder) : ""]));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const t = data?.totals;
  return (
    <div className="page">
      <PageHead crumbs={["Sales", "Customers"]} title="Customers" sub="Everyone who has created an account, with what they've ordered.">
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!data?.total}><Icon name="download" size={16} />Export CSV</button>
      </PageHead>

      <div className="kpis">
        <div className="card kpi"><span><i className="kpi-i"><Icon name="users" size={16} /></i>Customers</span><strong className="num">{t ? number(t.customers) : "—"}</strong><small>accounts created</small></div>
        <div className="card kpi is-green"><span><i className="kpi-i"><Icon name="bag" size={16} /></i>Paying customers</span><strong className="num">{t ? number(t.buyers) : "—"}</strong><small>placed at least one paid order</small></div>
        <div className="card kpi is-gold"><span><i className="kpi-i"><Icon name="repeat" size={16} /></i>Repeat rate</span><strong className="num">{t ? `${t.repeatRate}%` : "—"}</strong><small>of paying customers ordered again</small></div>
        <div className="card kpi"><span><i className="kpi-i"><Icon name="rupee" size={16} /></i>Lifetime revenue</span><strong className="num">{t ? money(t.revenue) : "—"}</strong><small>from all paid orders</small></div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <div className="tabs" role="tablist">
            {SEGMENTS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={segment === k} className={segment === k ? "on" : ""} onClick={() => setSegment(k)}>
                {label}<span className="count">{data?.counts?.[k] ?? "·"}</span>
              </button>
            ))}
          </div>
          <div className="toolbar" style={{ padding: "16px 0" }}>
            <div className="search">
              <Icon name="search" size={18} />
              <input className="input" placeholder="Search name, email, phone or city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
            </div>
            <select className="select" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort customers">
              <option value="recent">Most recent activity</option>
              <option value="spent">Highest spend</option>
              <option value="orders">Most orders</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Joined</th><th className="right">Orders</th><th className="right">Spent</th><th>Last order</th></tr></thead>
            <tbody>
              {!data ? [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 40 }} /></td></tr>)
                : data.data.length === 0 ? <tr><td colSpan={6}><Empty title="No customers here">{q ? "Try a different search." : "Customers appear here once they sign up on the store."}</Empty></td></tr>
                : data.data.map((c) => (
                  <tr key={c._id} className="clickable" onClick={() => setOpen(c._id)}>
                    <td>
                      <div className="cell-main">
                        <div className="cu-avatar">{c.avatar ? <img src={imageSrc(c.avatar)} alt="" /> : initials(c.name)}</div>
                        <div><strong>{c.name}</strong><small>{c.city || "—"}</small></div>
                      </div>
                    </td>
                    <td><div className="cu-cell2"><span>{c.email}</span><small className="muted">{c.phone || "—"}</small></div></td>
                    <td className="muted">{dateShort(c.joined)}</td>
                    <td className="right num">{number(c.orders)}{c.paidOrders !== c.orders && <small className="muted"> ({c.paidOrders} paid)</small>}</td>
                    <td className="right num"><strong>{money(c.spent)}</strong></td>
                    <td className="muted">{c.lastOrder ? timeAgo(c.lastOrder) : "Never"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="pager">
            <span className="muted">Page {data.page} of {data.pages} · {number(data.total)} customers</span>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {open && <CustomerDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default Customers;
