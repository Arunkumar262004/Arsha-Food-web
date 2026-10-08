import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, dateTime, timeAgo } from "../../lib/format";
import { PageHead, StatusBadge, PaymentBadge, Empty } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Order.css";

const FALLBACK_STATUSES = ["Payment Pending", "Food Processing", "Out for Delivery", "Delivered", "Cancelled", "Payment Failed"];
const PAGE_SIZE = 20;

const orderNo = (o) => o.orderNumber || `#${o._id.slice(-6).toUpperCase()}`;
const customerName = (o) => [o.address?.firstName, o.address?.lastName].filter(Boolean).join(" ") || "—";
const paymentState = (o) => (o.payment ? "paid" : o.paymentStatus === "failed" || o.status === "Payment Failed" ? "failed" : "pending");

const EVENT_LABEL = {
  order_created: "Order created",
  payment_initiated: "Payment initiated",
  payment_success: "Payment successful",
  payment_failed: "Payment failed",
  payment_verification_failed: "Payment verification failed",
  status_changed: "Status changed",
};

const Order = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [payFilter, setPayFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(null);

  const fetchAllorder = async () => {
    try {
      const res = await api.get("/api/order/list");
      if (res.data.success) {
        setOrders(res.data.data);
        if (res.data.statuses) setStatuses(res.data.statuses);
      } else toast.error("Error fetching orders");
    } catch (err) {
      toast.error(errMsg(err, "Error fetching orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllorder(); document.title = "Orders · Inofex Restaurant Admin"; }, []);
  useEffect(() => setPage(1), [tab, payFilter, q]);

  const counts = useMemo(() => {
    const c = { All: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) =>
      (tab === "All" || o.status === tab) &&
      (payFilter === "all" || paymentState(o) === payFilter) &&
      (!needle || [orderNo(o), customerName(o), o.address?.phone, o.address?.email, o.razorpayPaymentId]
        .some((v) => v && String(v).toLowerCase().includes(needle)))
    );
  }, [orders, tab, payFilter, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = async (order, status) => {
    setSaving(order._id);
    try {
      const res = await api.post("/api/order/status", { orderId: order._id, status });
      if (res.data.success) {
        toast.success(`${orderNo(order)} → ${status}`);
        await fetchAllorder();
      } else toast.error(res.data.message);
    } catch (err) {
      toast.error(errMsg(err, "Could not update status"));
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = () => {
    const head = ["Order", "Date", "Customer", "Phone", "Items", "Amount", "Payment", "Status"];
    const lines = filtered.map((o) => [
      orderNo(o), new Date(o.date).toISOString(), customerName(o), o.address?.phone || "",
      o.items.map((i) => `${i.name} x${i.quantity}`).join("; "), o.amount, paymentState(o), o.status,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <PageHead crumbs={["Sales", "Orders"]} title="Orders" sub={`${orders.length} orders in total`}>
        <button className="btn btn-ghost" onClick={() => { setLoading(true); fetchAllorder(); }}><Icon name="refresh" size={18} />Refresh</button>
        <button className="btn btn-outline" onClick={exportCsv} disabled={!filtered.length}><Icon name="upload" size={18} />Export CSV</button>
      </PageHead>

      <div className="card">
        <div className="card-pad ord-toolbar">
          <div className="tabs ord-tabs">
            {["All", ...statuses].map((s) => (
              <button key={s} className={tab === s ? "on" : ""} onClick={() => setTab(s)}>
                {s}<span className="count">{counts[s] || 0}</span>
              </button>
            ))}
          </div>
          <div className="ord-filters">
            <div className="search" style={{ flex: "1 1 260px" }}>
              <Icon name="search" size={18} />
              <input className="input" placeholder="Search order no., customer, phone, payment ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
            </div>
            <select className="select" style={{ flex: "0 1 180px" }} value={payFilter} onChange={(e) => setPayFilter(e.target.value)} aria-label="Payment filter">
              <option value="all">All payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="right">Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="right">Placed</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [0, 1, 2, 3, 4].map((i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 40 }} /></td></tr>)
                : rows.length === 0 ? <tr><td colSpan={8}><Empty title="No orders found">Try a different filter or search.</Empty></td></tr>
                : rows.map((o) => (
                  <tr key={o._id} className="clickable" onClick={() => navigate(`/orders/${o._id}`)}>
                    <td><strong>{orderNo(o)}</strong></td>
                    <td>
                      <div>{customerName(o)}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{[o.address?.city, o.address?.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td>
                      <div className="ord-items-cell">
                        <div className="ord-thumb-group">
                          {o.items.slice(0, 3).map((i, idx) => {
                            const img = i.image || (i.images && i.images[0]);
                            return (
                              <div className="ord-thumb-wrapper" key={idx} title={`${i.name} × ${i.quantity}`}>
                                {img ? (
                                  <img src={imageSrc(img)} alt={i.name} className="ord-thumb-img" />
                                ) : (
                                  <div className="ord-thumb-ph">🍱</div>
                                )}
                              </div>
                            );
                          })}
                          {o.items.length > 3 && (
                            <span className="ord-thumb-more">+{o.items.length - 3}</span>
                          )}
                        </div>
                        <div className="ord-items" title={o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}>
                          {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                        </div>
                      </div>
                    </td>
                    <td className="right num"><strong>{money(o.amount)}</strong></td>
                    <td><PaymentBadge paid={o.payment} status={paymentState(o)} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {can("orders.update") ? (
                        <select className="select status-select" value={o.status} disabled={saving === o._id}
                          onChange={(e) => updateStatus(o, e.target.value)} aria-label={`Status of ${orderNo(o)}`}>
                          {!statuses.includes(o.status) && <option value={o.status}>{o.status}</option>}
                          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <StatusBadge status={o.status} />}
                    </td>
                    <td className="right muted" title={dateTime(o.date)}>{timeAgo(o.date)}</td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                        onClick={() => navigate(`/orders/${o._id}`)}
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="pager">
            <span className="muted">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Order;
