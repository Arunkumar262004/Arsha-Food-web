import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, dateTime } from "../../lib/format";
import { PageHead, StatusBadge, PaymentBadge } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import { downloadInvoicePDF } from "../../lib/pdfGenerator";
import "./Order.css";

const FALLBACK_STATUSES = ["Payment Pending", "Food Processing", "Out for Delivery", "Delivered", "Cancelled", "Payment Failed"];

const EVENT_LABEL = {
  order_created: "Order created",
  payment_initiated: "Payment initiated",
  payment_success: "Payment successful",
  payment_failed: "Payment failed",
  payment_verification_failed: "Payment verification failed",
  status_changed: "Status changed",
};

const orderNo = (o) => o?.orderNumber || (o?._id ? `#${o._id.slice(-6).toUpperCase()}` : "Order");
const customerName = (o) => [o?.address?.firstName, o?.address?.lastName].filter(Boolean).join(" ") || "Customer";
const paymentState = (o) => (o?.payment ? "paid" : o?.paymentStatus === "failed" || o?.status === "Payment Failed" ? "failed" : "pending");

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const [order, setOrder] = useState(null);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await api.get("/api/order/list");
      if (res.data.success) {
        if (res.data.statuses) setStatuses(res.data.statuses);
        const found = res.data.data.find((o) => o._id === id || o.orderNumber === id);
        if (found) {
          setOrder(found);
          document.title = `Order ${orderNo(found)} · Inofex Restaurant Admin`;
        }
      }
    } catch (err) {
      toast.error(errMsg(err, "Could not load order details"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const updateStatus = async (newStatus) => {
    if (!order) return;
    setSaving(true);
    try {
      const res = await api.post("/api/order/status", { orderId: order._id, status: newStatus });
      if (res.data.success) {
        toast.success(`${orderNo(order)} → ${newStatus}`);
        await fetchOrder();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(errMsg(err, "Could not update order status"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHead crumbs={["Sales", "Orders", orderNo(order)]} title={`Order ${orderNo(order)}`} sub="Full order breakdown, customer details, timeline & downloadable invoice.">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => order && downloadInvoicePDF(order)}
          disabled={!order}
        >
          <Icon name="upload" size={16} /> Download PDF Invoice
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/orders")}>
          ← Back to Orders
        </button>
      </PageHead>

      {loading ? (
        <div className="card card-pad">
          <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
        </div>
      ) : !order ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 48 }}>
          <h3>Order Not Found</h3>
          <p className="muted">We could not locate this order in the system.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate("/orders")}>
            Return to Orders List
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* TOP SUMMARY BAR */}
          <div className="card card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <StatusBadge status={order.status} />
              <PaymentBadge paid={order.payment} status={paymentState(order)} />
              <span className="muted" style={{ fontSize: 13 }}>Placed on {dateTime(order.date)}</span>
            </div>

            {can("orders.update") && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Update Status:</span>
                <select
                  className="select"
                  style={{ width: 190 }}
                  value={order.status}
                  disabled={saving}
                  onChange={(e) => updateStatus(e.target.value)}
                >
                  {!statuses.includes(order.status) && <option value={order.status}>{order.status}</option>}
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* CUSTOMER & PAYMENT GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className="card card-pad">
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: ".06em", marginBottom: 10 }}>
                Customer Details
              </h4>
              <strong style={{ fontSize: 16, color: "var(--ink)" }}>{customerName(order)}</strong>
              {order.address?.email && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
                  <Icon name="mail" size={15} /> {order.address.email}
                </div>
              )}
              {order.address?.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                  <Icon name="phone" size={15} /> {order.address.phone}
                </div>
              )}
            </div>

            <div className="card card-pad">
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: ".06em", marginBottom: 10 }}>
                Delivery Address
              </h4>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
                <Icon name="mapPin" size={16} />
                <div>
                  {[order.address?.street, order.address?.city, order.address?.state, order.address?.zipcode, order.address?.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--primary)", letterSpacing: ".06em", marginBottom: 10 }}>
                Payment Info
              </h4>
              <dl className="od-dl">
                <dt>Method</dt>
                <dd><strong>{order.paymentMethod === "razorpay" ? "Razorpay" : order.paymentMethod || "Razorpay"}</strong></dd>
                {order.razorpayOrderId && <><dt>Gateway Order</dt><dd className="mono">{order.razorpayOrderId}</dd></>}
                {order.razorpayPaymentId && <><dt>Transaction ID</dt><dd className="mono">{order.razorpayPaymentId}</dd></>}
                {order.paidAt && <><dt>Paid At</dt><dd>{dateTime(order.paidAt)}</dd></>}
              </dl>
            </div>
          </div>

          {/* ITEM TABLE & FINANCIAL BREAKDOWN */}
          <div className="card card-pad">
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
              Order Items ({order.items.length})
            </h4>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dish Item</th>
                    <th className="right">Unit Price</th>
                    <th className="right">Qty</th>
                    <th className="right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i, idx) => {
                    const img = i.image || (i.images && i.images[0]);
                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {img ? (
                              <img src={imageSrc(img)} alt={i.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                            ) : (
                              <span className="od-ph">🍱</span>
                            )}
                            <div>
                              <strong style={{ fontWeight: 600 }}>{i.name}</strong>
                              {i.category && <div className="muted" style={{ fontSize: 12 }}>{i.category}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="right num">{money(i.price)}</td>
                        <td className="right num"><strong>{i.quantity}</strong></td>
                        <td className="right num"><strong>{money((i.price || 0) * (i.quantity || 1))}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="od-totals" style={{ maxWidth: 360, marginLeft: "auto", marginTop: 20 }}>
              {order.subtotal !== undefined && <div><span>Subtotal</span><span className="num">{money(order.subtotal)}</span></div>}
              {order.discount > 0 && <div><span>Coupon {order.couponCode}</span><span className="num" style={{ color: "var(--up)" }}>−{money(order.discount)}</span></div>}
              {order.deliveryFee !== undefined && <div><span>Delivery</span><span className="num">{order.deliveryFee === 0 ? "FREE" : money(order.deliveryFee)}</span></div>}
              <div className="od-total"><span>Grand Total</span><span className="num">{money(order.amount)}</span></div>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="card card-pad">
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
              Order Lifecycle & Event Log
            </h4>
            {(order.timeline || []).length === 0 ? (
              <p className="muted">No event timeline recorded.</p>
            ) : (
              <ol className="timeline">
                {[...order.timeline].reverse().map((t, i) => (
                  <li key={i} className={/fail/.test(t.event) ? "bad" : t.event === "payment_success" ? "good" : ""}>
                    <strong>
                      {EVENT_LABEL[t.event] || t.event}
                      {t.event === "status_changed" && `: ${t.from} → ${t.to}`}
                    </strong>
                    <span className="muted">{dateTime(t.at)}{t.by ? ` · ${t.by}` : ""}</span>
                    {t.note && t.event !== "status_changed" && <span className="muted mono" style={{ fontSize: 12 }}>{t.note}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetail;
