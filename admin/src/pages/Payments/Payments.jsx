import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { money, number, dateTime } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { PageHead, Empty, Segmented, StatusBadge } from "../../components/ui";
import Icon from "../../components/Icon";
import "../Reports/Reports.css";

const RANGES = [
  { value: "today", label: "Today" }, { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" },
  { value: "month", label: "This month" }, { value: "prevmonth", label: "Last month" }, { value: "year", label: "This year" },
];
const STATE = {
  paid: ["Paid", "badge-green"], pending: ["Awaiting payment", "badge-amber"], failed: ["Failed", "badge-red"], refunded: ["Refunded", "badge-purple"],
};
const METHOD = { razorpay: "Razorpay", stripe: "Stripe (legacy)", cod: "Cash on delivery" };

const Payments = () => {
  const [range, setRange] = useState("30d");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => { document.title = "Payments · Inofex Restaurant Admin"; }, []);
  useEffect(() => { setPage(1); }, [range, status, q]);
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/api/admin/payments", { params: { range, status, q, page } })
        .then((r) => setData(r.data)).catch((err) => toast.error(errMsg(err, "Could not load payments")));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [range, status, q, page]);

  const exportCsv = async () => {
    try {
      const rows = [];
      for (let p = 1; ; p++) {
        const r = await api.get("/api/admin/payments", { params: { range, status, q, page: p } });
        rows.push(...r.data.data);
        if (p >= r.data.pages) break;
      }
      downloadCsv(`payments-${range}.csv`, ["Order", "Date", "Customer", "Phone", "Amount", "Payment", "Method", "Razorpay payment ID", "Razorpay order ID", "Paid at", "Order status"],
        rows.map((o) => [o.orderNumber, dateTime(o.date), o.customer, o.address?.phone, o.amount, STATE[o.state]?.[0] || o.state, METHOD[o.paymentMethod] || o.paymentMethod, o.razorpayPaymentId, o.razorpayOrderId, o.paidAt ? dateTime(o.paidAt) : "", o.status]));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const s = data?.summary;
  const tile = (key, icon, cls, hint) => (
    <button className={`card kpi kpi-btn ${cls} ${status === key ? "on" : ""}`} onClick={() => setStatus(status === key ? "all" : key)}>
      <span><i className="kpi-i"><Icon name={icon} size={16} /></i>{STATE[key][0]}</span>
      <strong className="num">{s ? money(s[key].amount) : "—"}</strong>
      <small>{s ? `${number(s[key].count)} order${s[key].count === 1 ? "" : "s"}` : ""}{hint ? ` · ${hint}` : ""}</small>
    </button>
  );

  return (
    <div className="page">
      <PageHead crumbs={["Sales", "Payments"]} title="Payments" sub="Every payment attempt, matched to its order.">
        <Segmented value={range} onChange={setRange} ariaLabel="Date range" options={RANGES} />
        <button className="btn btn-ghost" onClick={exportCsv} disabled={!data?.total}><Icon name="download" size={16} />Export CSV</button>
      </PageHead>

      <div className="kpis">
        {tile("paid", "check", "is-green", s?.successRate !== null && s ? `${s.successRate}% success rate` : "")}
        {tile("pending", "clock", "is-gold", "checkout not finished")}
        {tile("failed", "close", "is-red")}
        {tile("refunded", "refresh", "")}
      </div>

      {data?.methods?.length > 0 && (
        <div className="card card-pad rp-methods">
          <span className="muted">Collected by</span>
          {data.methods.map((m) => (
            <span key={m.method} className="rp-method"><strong>{METHOD[m.method] || m.method}</strong>{money(m.amount)} · {number(m.count)} orders</span>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-pad toolbar" style={{ paddingBottom: 16 }}>
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" placeholder="Order number, customer, phone or Razorpay ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
          </div>
          <select className="select" style={{ width: 200 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Payment status">
            <option value="all">All payments</option>
            {Object.entries(STATE).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Method / reference</th><th>Order status</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {!data ? [0, 1, 2].map((i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 40 }} /></td></tr>)
                : data.data.length === 0 ? <tr><td colSpan={6}><Empty title="No payments in this period">Try a wider date range.</Empty></td></tr>
                : data.data.map((o) => {
                  const [label, cls] = STATE[o.state] || [o.state, ""];
                  return (
                    <tr key={o._id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <Link to={`/orders/${o._id}`} className="link-btn">{o.orderNumber || `#${o._id.slice(-6).toUpperCase()}`}</Link>
                        <div className="muted" style={{ fontSize: 12.5 }}>{dateTime(o.date)}</div>
                      </td>
                      <td>{o.customer}<div className="muted" style={{ fontSize: 12.5 }}>{o.address?.phone || ""}</div></td>
                      <td><span className={`badge ${cls}`}><span className="dot" />{label}</span>{o.paidAt && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{dateTime(o.paidAt)}</div>}</td>
                      <td>
                        {METHOD[o.paymentMethod] || o.paymentMethod || "—"}
                        <div className="rp-ref">{o.razorpayPaymentId || o.razorpayOrderId || "—"}</div>
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="right num"><strong>{money(o.amount)}</strong>{o.discount > 0 && <div className="muted" style={{ fontSize: 12 }}>−{money(o.discount)} {o.couponCode}</div>}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && (
          <div className="pager">
            <span className="muted">Page {data.page} of {data.pages} · {number(data.total)} payments</span>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
