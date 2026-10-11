import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, moneyShort, number, bucketLabel, dateShort } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { CHART, SERIES_SEQ } from "../../lib/theme";
import { PageHead, Empty, Segmented } from "../../components/ui";
import Icon from "../../components/Icon";
import "./Reports.css";

const RANGES = [
  { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "month", label: "This month" },
  { value: "prevmonth", label: "Last month" }, { value: "year", label: "This year" }, { value: "custom", label: "Custom" },
];
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

const Tip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <span>{fmt ? fmt(label) : label}</span>
      {payload.map((p) => <strong key={p.dataKey} className="num">{p.dataKey === "revenue" ? money(p.value) : `${number(p.value)} orders`}</strong>)}
    </div>
  );
};

const Section = ({ title, sub, action, children, className = "" }) => (
  <section className={`card rp-section ${className}`}>
    <header className="card-head">
      <div><h3 className="card-title">{title}</h3>{sub && <span className="card-sub">{sub}</span>}</div>
      {action}
    </header>
    {children}
  </section>
);

const CsvBtn = ({ onClick }) => <button className="btn btn-ghost btn-sm" onClick={onClick}><Icon name="download" size={14} />CSV</button>;

const Reports = () => {
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [metric, setMetric] = useState("revenue");
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Reports · Inofex Restaurant Admin"; }, []);
  useEffect(() => {
    if (range === "custom" && (!from || !to || from > to)) return;
    setLoading(true);
    api.get("/api/admin/reports", { params: { range, from, to } })
      .then((res) => setR(res.data)).catch((err) => toast.error(errMsg(err, "Could not load the report")))
      .finally(() => setLoading(false));
  }, [range, from, to]);

  const t = r?.totals;
  const unit = r?.range.unit;
  const period = r ? `${dateShort(r.range.start)} – ${dateShort(new Date(new Date(r.range.end) - 1))}` : "";
  const catTotal = r?.categories.reduce((s, c) => s + c.revenue, 0) || 0;
  const busiest = r?.hours.reduce((a, b) => (b.orders > a.orders ? b : a), { orders: 0 });
  const file = (name) => `${name}-${r?.range.key}-${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <div className="page">
      <PageHead crumbs={["Overview", "Reports"]} title="Reports" sub={period ? `Paid orders only · ${period}` : "Paid orders only"}>
        <Segmented value={range} onChange={setRange} ariaLabel="Report period" options={RANGES} />
      </PageHead>

      {range === "custom" && (
        <div className="rp-custom card card-pad">
          <div className="field"><label htmlFor="rp-from">From</label><input id="rp-from" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label htmlFor="rp-to">To</label><input id="rp-to" type="date" className="input" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
      )}

      <div className={`kpis ${loading ? "is-loading" : ""}`}>
        <div className="card kpi"><span><i className="kpi-i"><Icon name="rupee" size={16} /></i>Net sales</span><strong className="num">{t ? money(t.revenue) : "—"}</strong><small>{t ? `${money(t.subtotal)} food + ${money(t.delivery)} delivery − ${money(t.discount)} discounts` : ""}</small></div>
        <div className="card kpi is-green"><span><i className="kpi-i"><Icon name="bag" size={16} /></i>Paid orders</span><strong className="num">{t ? number(t.orders) : "—"}</strong><small>{t ? `${t.conversion}% of ${number(t.allOrders)} placed were paid` : ""}</small></div>
        <div className="card kpi is-gold"><span><i className="kpi-i"><Icon name="receipt" size={16} /></i>Average order</span><strong className="num">{t ? money(t.avgOrder) : "—"}</strong><small>{t ? `${number(t.itemsSold)} items sold` : ""}</small></div>
        <div className="card kpi"><span><i className="kpi-i"><Icon name="users" size={16} /></i>Customers</span><strong className="num">{t ? number(t.customers) : "—"}</strong><small>placed a paid order</small></div>
      </div>

      <Section title="Sales over time" sub={metric === "revenue" ? "Net sales per period" : "Paid orders per period"}
        action={<div className="toolbar">
          <Segmented value={metric} onChange={setMetric} ariaLabel="Metric" options={[{ value: "revenue", label: "Sales" }, { value: "orders", label: "Orders" }]} />
          {r && <CsvBtn onClick={() => downloadCsv(file("sales"), ["Period", "Net sales", "Paid orders", "Discounts"], r.series.map((s) => [s.bucket, s.revenue, s.orders, s.discount]))} />}
        </div>}>
        <div className="rp-chart">
          {r && (
            <ResponsiveContainer width="100%" height={290}>
              {metric === "revenue" ? (
                <AreaChart data={r.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="rpfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.primary} stopOpacity={0.22} /><stop offset="100%" stopColor={CHART.primary} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(b, unit)} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tickFormatter={(v) => moneyShort(v).replace(".00", "")} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<Tip fmt={(b) => bucketLabel(b, unit)} />} cursor={{ stroke: CHART.axis, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2.5} fill="url(#rpfill)" />
                </AreaChart>
              ) : (
                <BarChart data={r.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="bucket" tickFormatter={(b) => bucketLabel(b, unit)} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART.axis }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<Tip fmt={(b) => bucketLabel(b, unit)} />} cursor={{ fill: "rgba(122,74,33,.06)" }} />
                  <Bar dataKey="orders" fill={CHART.gold} radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </Section>

      <div className="rp-grid">
        <Section title="Sales by category" sub={r ? `${r.categories.length} categories sold` : ""}
          action={r?.categories.length > 0 && <CsvBtn onClick={() => downloadCsv(file("categories"), ["Category", "Items sold", "Sales", "Share %"], r.categories.map((c) => [c.name, c.quantity, c.revenue, catTotal ? ((c.revenue / catTotal) * 100).toFixed(1) : 0]))} />}>
          {!r?.categories.length ? <Empty title="No sales yet" /> : (
            <ul className="rp-bars">
              {r.categories.map((c, i) => {
                const share = catTotal ? (c.revenue / catTotal) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="rp-bar-top"><span><i style={{ background: SERIES_SEQ[i % SERIES_SEQ.length] }} />{c.name}</span><strong className="num">{money(c.revenue)}</strong></div>
                    <div className="rp-bar"><span style={{ width: `${Math.max(2, share)}%`, background: SERIES_SEQ[i % SERIES_SEQ.length] }} /></div>
                    <small className="muted">{number(c.quantity)} items · {share.toFixed(1)}%</small>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="When customers order" sub={busiest?.orders ? `Busiest hour: ${hourLabel(busiest.hour)}–${hourLabel((busiest.hour + 1) % 24)}` : "Orders by hour of day"}>
          {r && (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={r.hours} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="hour" tickFormatter={hourLabel} interval={2} tick={{ fontSize: 11, fill: CHART.axis }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip content={<Tip fmt={(h) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`} />} cursor={{ fill: "rgba(122,74,33,.06)" }} />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                    {r.hours.map((h) => <Cell key={h.hour} fill={h.hour === busiest?.hour && h.orders ? CHART.primary : CHART.gold} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="rp-week">
                {r.weekdays.map((d) => {
                  const max = Math.max(1, ...r.weekdays.map((x) => x.orders));
                  return (
                    <div key={d.day} title={`${d.orders} orders · ${money(d.revenue)}`}>
                      <span style={{ opacity: 0.15 + (d.orders / max) * 0.85 }} />
                      <small>{d.day}</small><strong className="num">{d.orders}</strong>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      </div>

      <Section title="Dishes" sub="Every dish sold in this period, best sellers first"
        action={r?.products.length > 0 && <CsvBtn onClick={() => downloadCsv(file("dishes"), ["Dish", "Category", "Quantity", "Orders", "Sales"], r.products.map((p) => [p.name, p.category, p.quantity, p.orders, p.revenue]))} />}>
        {!r?.products.length ? <Empty title="No dishes sold in this period" /> : (
          <div className="table-wrap rp-flush">
            <table className="table">
              <thead><tr><th>#</th><th>Dish</th><th className="right">Qty sold</th><th className="right">Orders</th><th className="right">Sales</th><th style={{ width: 160 }}>Share</th></tr></thead>
              <tbody>
                {r.products.slice(0, 25).map((p, i) => {
                  const share = t.subtotal ? (p.revenue / t.subtotal) * 100 : 0;
                  return (
                    <tr key={p._id}>
                      <td className="muted num">{i + 1}</td>
                      <td><div className="cell-main">{p.image && <img className="thumb" src={imageSrc(p.image)} alt="" />}<div><strong>{p.name}</strong><small>{p.category}</small></div></div></td>
                      <td className="right num">{number(p.quantity)}</td>
                      <td className="right num">{number(p.orders)}</td>
                      <td className="right num"><strong>{money(p.revenue)}</strong></td>
                      <td><div className="rp-bar sm"><span style={{ width: `${Math.max(2, share)}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="rp-grid">
        <Section title="Top customers" sub="By spend in this period"
          action={r?.topCustomers.length > 0 && <CsvBtn onClick={() => downloadCsv(file("top-customers"), ["Customer", "Email", "Orders", "Spent"], r.topCustomers.map((c) => [c.name, c.email, c.orders, c.spent]))} />}>
          {!r?.topCustomers.length ? <Empty title="No customers yet" /> : (
            <ol className="rp-rank">
              {r.topCustomers.map((c, i) => (
                <li key={c.id}><span className="rp-rank-n">{i + 1}</span><div><strong>{c.name}</strong><small>{c.email || "—"} · {c.orders} order{c.orders === 1 ? "" : "s"}</small></div><strong className="num">{money(c.spent)}</strong></li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Coupons" sub={t ? `${money(t.discount)} given in discounts` : ""}
          action={r?.coupons.length > 0 && <CsvBtn onClick={() => downloadCsv(file("coupons"), ["Code", "Uses", "Discount given", "Sales"], r.coupons.map((c) => [c.code, c.uses, c.discount, c.revenue]))} />}>
          {!r?.coupons.length ? <Empty title="No coupons used">Orders in this period were placed at full price.</Empty> : (
            <ol className="rp-rank">
              {r.coupons.map((c) => (
                <li key={c.code}><span className="rp-code">{c.code}</span><div><strong>{number(c.uses)} use{c.uses === 1 ? "" : "s"}</strong><small>{money(c.revenue)} in sales</small></div><strong className="num rp-neg">−{money(c.discount)}</strong></li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </div>
  );
};

export default Reports;
