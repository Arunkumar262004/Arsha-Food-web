import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, moneyShort, number, bucketLabel, timeAgo } from "../../lib/format";
import { Delta, Segmented, PageHead, StatusBadge, PaymentBadge, Empty } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

// Categorical order (validated: CVD-safe adjacent pairs). Orange is low-contrast, so it always ships with a text label.
const SERIES = { blue: "#2F6BFF", orange: "#F08A24", teal: "#14A38B", purple: "#8B5CF6" };

// Status colours are reserved for order state and always appear next to their label.
const STATUS_COLOR = {
  "Payment Pending": "#E0A030",
  "Food Processing": "#2F6BFF",
  "Out for Delivery": "#8B5CF6",
  "Delivered": "#12A36B",
  "Cancelled": "#E5384F",
  "Payment Failed": "#F07B8A",
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "prevmonth", label: "Last month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const METHOD_LABEL = { razorpay: "Razorpay", stripe: "Stripe (legacy)", cod: "Cash on delivery" };

const Sparkline = ({ values, color }) => {
  const w = 96, h = 40;
  if (!values.length || values.every((v) => v === 0)) {
    return <svg width={w} height={h} aria-hidden="true"><line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="3 4" /></svg>;
  }
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - 3 - ((v - min) / (max - min || 1)) * (h - 8),
  ]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const id = `sp-${color.slice(1)}`;
  return (
    <svg width={w} height={h} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const KpiCard = ({ icon, label, value, delta, spark, color, tint }) => (
  <div className="card kpi">
    <div className="kpi-top">
      <div className="kpi-icon" style={{ background: tint, color }}><Icon name={icon} size={22} /></div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value num" title={value}>{value}</strong>
      </div>
    </div>
    <div className="kpi-foot">
      <Delta value={delta} label="vs prev. period" />
      <Sparkline values={spark} color={color} />
    </div>
  </div>
);

const ChartTip = ({ active, payload, label, unit, metric }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="chart-tip">
      <span>{bucketLabel(label, unit)}</span>
      <strong className="num">{metric === "revenue" ? money(v) : `${number(v)} orders`}</strong>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [range, setRange] = useState("7d");
  const [custom, setCustom] = useState(() => {
    const to = new Date(), from = new Date(Date.now() - 6 * 86400000);
    const f = (d) => d.toISOString().slice(0, 10);
    return { from: f(from), to: f(to) };
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("revenue");
  const [salesWindow, setSalesWindow] = useState("todaySales");
  const [orderTab, setOrderTab] = useState("all");

  useEffect(() => {
    if (range === "custom" && (!custom.from || !custom.to || custom.from > custom.to)) return;
    let alive = true;
    setLoading(true);
    const params = range === "custom" ? { range, ...custom } : { range };
    api.get("/api/admin/dashboard", { params })
      .then((r) => { if (alive) { setData(r.data); setError(""); } })
      .catch((err) => alive && setError(errMsg(err, "Could not load dashboard")))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [range, custom]);

  useEffect(() => { document.title = "Dashboard · Inofex Restaurant Admin"; }, []);

  const series = useMemo(() => data?.series || [], [data]);
  const unit = data?.range?.unit;
  const p = data?.period;
  const k = data?.kpis;

  const statusData = useMemo(
    () => (data?.ordersByStatus || []).filter((s) => s.count > 0).sort((a, b) => b.count - a.count),
    [data]
  );
  const statusTotal = statusData.reduce((a, s) => a + s.count, 0);

  const recent = useMemo(() => {
    const rows = data?.recentOrders || [];
    if (orderTab === "paid") return rows.filter((o) => o.paid);
    if (orderTab === "unpaid") return rows.filter((o) => !o.paid);
    return rows;
  }, [data, orderTab]);

  const pipeline = k ? [
    { label: "Awaiting payment", value: k.pendingOrders, color: STATUS_COLOR["Payment Pending"] },
    { label: "Processing", value: k.processingOrders, color: STATUS_COLOR["Food Processing"] },
    { label: "Out for delivery", value: k.outForDelivery, color: STATUS_COLOR["Out for Delivery"] },
    { label: "Delivered", value: k.completedOrders, color: STATUS_COLOR["Delivered"] },
    { label: "Cancelled / failed", value: k.cancelledOrders, color: STATUS_COLOR["Cancelled"] },
  ] : [];
  const pipelineMax = Math.max(1, ...pipeline.map((x) => x.value));

  const maxCat = Math.max(1, ...(data?.topCategories || []).map((c) => c.revenue));
  const payTotal = (data?.paymentMethods || []).reduce((a, m) => a + m.amount, 0);

  return (
    <div className="page dash">
      <PageHead crumbs={["Overview", "Dashboard"]} title="Dashboard" sub="Here's what's happening with your store.">
        <div className="dash-filters">
          <Segmented options={RANGES} value={range} onChange={setRange} ariaLabel="Date range" />
          {range === "custom" && (
            <div className="dash-custom">
              <input type="date" className="input" value={custom.from} max={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From date" />
              <span className="muted">to</span>
              <input type="date" className="input" value={custom.to} min={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To date" />
            </div>
          )}
        </div>
      </PageHead>

      {error && !data && (
        <div className="card card-pad"><Empty title="Dashboard unavailable">{error}</Empty></div>
      )}

      {!data && loading && (
        <div className="kpi-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="card skeleton" style={{ height: 112 }} />)}</div>
      )}

      {data && (
        <div className={`dash-body ${loading ? "is-loading" : ""}`}>
          {/* ── KPI row ── */}
          <div className="kpi-grid">
            <KpiCard icon="rupee" label="Revenue" value={moneyShort(p.revenue)} delta={p.revenueChange}
              spark={series.map((s) => s.revenue)} color={SERIES.blue} tint="var(--primary-soft)" />
            <KpiCard icon="bag" label="Orders" value={number(p.orders)} delta={p.ordersChange}
              spark={series.map((s) => s.orders)} color={SERIES.teal} tint="#e5f6f2" />
            <KpiCard icon="user" label="New customers" value={number(p.newCustomers)} delta={p.newCustomersChange}
              spark={series.map((s) => s.newCustomers)} color={SERIES.orange} tint="#fff1e3" />
            <KpiCard icon="receipt" label="Avg. order value" value={money(p.aov)} delta={p.aovChange}
              spark={series.map((s) => s.orders ? s.revenue / s.orders : 0)} color={SERIES.purple} tint="var(--accent-soft)" />
          </div>

          {/* ── Sales summary + revenue chart ── */}
          <div className="dash-row r-main">
            <div className="card card-pad sales">
              <Segmented ariaLabel="Sales window" value={salesWindow} onChange={setSalesWindow} options={[
                { value: "todaySales", label: "Today" },
                { value: "weekSales", label: "7 days" },
                { value: "monthSales", label: "Month" },
                { value: "totalSales", label: "All time" },
              ]} />
              <div className="sales-big">
                <strong className="num">{money(k[salesWindow])}</strong>
                <span className="muted">Paid sales</span>
              </div>
              <div className="sales-mini">
                <div><strong className="num">{number(k.totalOrders)}</strong><span>Total orders</span></div>
                <div><strong className="num">{number(k.totalProducts)}</strong><span>Products</span></div>
                <div><strong className="num">{number(k.totalCustomers)}</strong><span>Customers</span></div>
              </div>
              <div className="sales-actions">
                {can("products.create") && <button className="btn btn-primary" onClick={() => navigate("/products/new")}><Icon name="plus" size={18} />Add product</button>}
                {can("orders.view") && <button className="btn btn-outline" onClick={() => navigate("/orders")}><Icon name="bag" size={18} />View orders</button>}
              </div>

              <div className="pipeline">
                <div className="pipeline-head"><span>Order pipeline</span><span className="muted">all time</span></div>
                {pipeline.map((x) => (
                  <div className="pipe-row" key={x.label}>
                    <span className="pipe-label"><i style={{ background: x.color }} />{x.label}</span>
                    <span className="pipe-track"><span style={{ width: `${(x.value / pipelineMax) * 100}%`, background: x.color }} /></span>
                    <strong className="num">{number(x.value)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-pad chart-card">
              <div className="card-head">
                <div>
                  <div className="card-title">{metric === "revenue" ? "Revenue overview" : "Orders over time"}</div>
                  <div className="chart-stats">
                    <span className="num">{metric === "revenue" ? money(p.revenue) : number(p.orders)}</span>
                    <Delta value={metric === "revenue" ? p.revenueChange : p.ordersChange} label="vs previous period" />
                  </div>
                </div>
                <Segmented ariaLabel="Chart metric" value={metric} onChange={setMetric}
                  options={[{ value: "revenue", label: "Revenue" }, { value: "orders", label: "Orders" }]} />
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  {metric === "revenue" ? (
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0" stopColor={SERIES.blue} stopOpacity=".18" />
                          <stop offset="1" stopColor={SERIES.blue} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#edf0f6" />
                      <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(b, unit)} tick={{ fontSize: 12, fill: "#8a93a8" }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis tickFormatter={(v) => moneyShort(v).replace(".00", "")} tick={{ fontSize: 12, fill: "#8a93a8" }} axisLine={false} tickLine={false} width={64} />
                      <Tooltip content={<ChartTip unit={unit} metric="revenue" />} cursor={{ stroke: "#8a93a8", strokeDasharray: "4 4" }} />
                      <Area type="monotone" dataKey="revenue" stroke={SERIES.blue} strokeWidth={2} fill="url(#revFill)"
                        activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="#edf0f6" />
                      <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(b, unit)} tick={{ fontSize: 12, fill: "#8a93a8" }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8a93a8" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<ChartTip unit={unit} metric="orders" />} cursor={{ fill: "rgba(47,107,255,.06)" }} />
                      <Bar dataKey="orders" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Status / products / payments ── */}
          <div className="dash-row r-three">
            <div className="card card-pad">
              <div className="card-head"><div className="card-title">Orders by status</div></div>
              {statusTotal === 0 ? <Empty title="No orders in this period" /> : (
                <>
                  <div className="donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="count" nameKey="status" innerRadius="68%" outerRadius="100%"
                          startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                          {statusData.map((s) => <Cell key={s.status} fill={STATUS_COLOR[s.status] || "#b8c0d0"} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} orders`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center"><strong className="num">{number(statusTotal)}</strong><span>orders</span></div>
                  </div>
                  <ul className="legend">
                    {statusData.map((s) => (
                      <li key={s.status}>
                        <i style={{ background: STATUS_COLOR[s.status] || "#b8c0d0" }} />
                        <span>{s.status}</span>
                        <strong className="num">{Math.round((s.count / statusTotal) * 100)}%</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-head">
                <div className="card-title">Top products</div>
                {can("products.view") && <button className="link-btn" onClick={() => navigate("/products")}>View all</button>}
              </div>
              {data.topProducts.length === 0 ? <Empty title="No sales in this period" /> : (
                <ul className="top-list">
                  {data.topProducts.map((t) => (
                    <li key={t.id}>
                      <img src={imageSrc(t.image)} alt="" loading="lazy" />
                      <div className="top-text">
                        <strong>{t.name}</strong>
                        <span>{number(t.quantity)} sold · {t.category}</span>
                      </div>
                      <strong className="num">{money(t.revenue)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card card-pad">
              <div className="card-head"><div className="card-title">Top categories</div><span className="muted">revenue</span></div>
              {data.topCategories.length === 0 ? <Empty title="No sales in this period" /> : (
                <div className="depth">
                  {data.topCategories.map((c) => (
                    <div className="depth-row" key={c.category}>
                      <span className="depth-bar" style={{ width: `${(c.revenue / maxCat) * 100}%` }} />
                      <span>{c.category}</span>
                      <span className="muted num">{number(c.quantity)} sold</span>
                      <strong className="num">{money(c.revenue)}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="card-head" style={{ marginTop: 20 }}><div className="card-title">Payment methods</div></div>
              {data.paymentMethods.length === 0 ? <p className="muted">No paid orders in this period.</p> : (
                <ul className="legend">
                  {data.paymentMethods.map((m, i) => (
                    <li key={m.method}>
                      <i style={{ background: Object.values(SERIES)[i % 4] }} />
                      <span>{METHOD_LABEL[m.method] || m.method}</span>
                      <span className="muted num">{number(m.count)}</span>
                      <strong className="num">{payTotal ? Math.round((m.amount / payTotal) * 100) : 0}%</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Recent orders ── */}
          <div className="card">
            <div className="card-head card-pad" style={{ marginBottom: 0, paddingBottom: 12 }}>
              <div className="tabs">
                {[["all", "Recent orders"], ["paid", "Paid"], ["unpaid", "Unpaid"]].map(([v, l]) => (
                  <button key={v} className={orderTab === v ? "on" : ""} onClick={() => setOrderTab(v)}>{l}</button>
                ))}
              </div>
              {can("orders.view") && <button className="link-btn" onClick={() => navigate("/orders")}>View all orders <Icon name="arrowRight" size={16} /></button>}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="right">Amount</th><th className="right">Placed</th></tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={7}><Empty title="No orders to show" /></td></tr>
                  ) : recent.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.orderNumber}</strong></td>
                      <td>{o.customer}</td>
                      <td className="num">{o.items}</td>
                      <td><PaymentBadge paid={o.paid} status={o.status === "Payment Failed" ? "failed" : "pending"} /></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="right num"><strong>{money(o.amount)}</strong></td>
                      <td className="right muted">{timeAgo(o.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Encouragement banner (driven by the real period comparison) ── */}
          {p.revenueChange !== null && (
            <div className="banner">
              <div className="banner-icon"><Icon name="star" size={22} /></div>
              <div>
                <strong>{p.revenueChange >= 0 ? "You're doing great!" : "A slower period"}</strong>
                <p>
                  Revenue is {Math.abs(p.revenueChange)}% {p.revenueChange >= 0 ? "higher" : "lower"} than the previous period
                  {p.returningBuyers > 0 && ` · ${number(p.returningBuyers)} returning and ${number(p.newBuyers)} first-time buyers`}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
