import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { money, number } from "../../lib/format";
import { PageHead, Empty, Segmented } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Inventory.css";

const VegMark = ({ veg }) => <span className={`iv-veg ${veg ? "veg" : "nonveg"}`} title={veg ? "Vegetarian" : "Non-vegetarian"} />;

const Inventory = () => {
  const { can } = useAuth();
  const editable = can("products.update");
  const [foods, setFoods] = useState(null);
  const [order, setOrder] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(new Set());

  const load = async () => {
    try {
      const [f, c] = await Promise.all([api.get("/api/food/list"), api.get("/api/admin/categories").catch(() => ({ data: { data: [] } }))]);
      setFoods(f.data.data || []);
      setOrder(c.data.data.map((x) => x.name));
    } catch (err) {
      toast.error(errMsg(err, "Could not load the menu"));
    }
  };
  useEffect(() => { load(); document.title = "Inventory · Inofex Restaurant Admin"; }, []);

  const setAvailability = async (ids, isAvailable) => {
    setBusy((b) => new Set([...b, ...ids]));
    setFoods((fs) => fs.map((f) => (ids.includes(f._id) ? { ...f, isAvailable } : f)));
    try {
      const r = await api.post("/api/food/availability", { ids, isAvailable });
      toast.success(r.data.message);
    } catch (err) {
      toast.error(errMsg(err));
      load();
    } finally {
      setBusy((b) => { const n = new Set(b); ids.forEach((id) => n.delete(id)); return n; });
    }
  };

  const soldOut = foods?.filter((f) => f.isAvailable === false).length || 0;
  const groups = useMemo(() => {
    if (!foods) return [];
    const needle = q.trim().toLowerCase();
    const list = foods.filter((f) =>
      (filter === "all" || (filter === "out" ? f.isAvailable === false : f.isAvailable !== false)) &&
      (!needle || f.name.toLowerCase().includes(needle) || f.category.toLowerCase().includes(needle)));
    const by = {};
    for (const f of list) (by[f.category] = by[f.category] || []).push(f);
    const rank = (c) => { const i = order.indexOf(c); return i === -1 ? 999 : i; };
    return Object.keys(by).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((name) => ({ name, items: by[name].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [foods, filter, q, order]);

  return (
    <div className="page">
      <PageHead crumbs={["Catalog", "Inventory"]} title="Inventory"
        sub="Mark dishes sold out when the kitchen runs out. Customers still see them, but can't order until you switch them back on." >
        {editable && soldOut > 0 && (
          <button className="btn btn-outline" onClick={() => setAvailability(foods.filter((f) => f.isAvailable === false).map((f) => f._id), true)}>
            <Icon name="refresh" size={16} />Restock all ({soldOut})
          </button>
        )}
      </PageHead>

      <div className="kpis">
        <div className="card kpi"><span><i className="kpi-i"><Icon name="box" size={16} /></i>Dishes on the menu</span><strong className="num">{foods ? number(foods.length) : "—"}</strong></div>
        <div className="card kpi is-green"><span><i className="kpi-i"><Icon name="check" size={16} /></i>Available now</span><strong className="num">{foods ? number(foods.length - soldOut) : "—"}</strong></div>
        <div className={`card kpi ${soldOut ? "is-red" : ""}`}><span><i className="kpi-i"><Icon name="clock" size={16} /></i>Sold out</span><strong className="num">{foods ? number(soldOut) : "—"}</strong></div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input className="input" placeholder="Find a dish or category…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />
        </div>
        <Segmented value={filter} onChange={setFilter} ariaLabel="Filter" options={[
          { value: "all", label: "All" }, { value: "in", label: "Available" }, { value: "out", label: `Sold out${soldOut ? ` (${soldOut})` : ""}` },
        ]} />
      </div>

      {!foods ? <div className="card skeleton" style={{ height: 300 }} />
        : groups.length === 0 ? <div className="card"><Empty title={filter === "out" ? "Nothing is sold out" : "No dishes match"}>{filter === "out" ? "Every dish can be ordered right now." : "Try another search."}</Empty></div>
        : groups.map((g) => {
          const out = g.items.filter((f) => f.isAvailable === false).length;
          return (
            <section key={g.name} className="card iv-group">
              <header className="iv-head">
                <div>
                  <h3>{g.name}</h3>
                  <span className="muted">{g.items.length} dish{g.items.length === 1 ? "" : "es"}{out ? ` · ${out} sold out` : ""}</span>
                </div>
                {editable && (
                  <div className="iv-bulk">
                    <button className="btn btn-ghost btn-sm" disabled={out === g.items.length} onClick={() => setAvailability(g.items.filter((f) => f.isAvailable !== false).map((f) => f._id), false)}>Mark all sold out</button>
                    <button className="btn btn-ghost btn-sm" disabled={out === 0} onClick={() => setAvailability(g.items.filter((f) => f.isAvailable === false).map((f) => f._id), true)}>Mark all available</button>
                  </div>
                )}
              </header>
              <ul className="iv-list">
                {g.items.map((f) => {
                  const available = f.isAvailable !== false;
                  return (
                    <li key={f._id} className={available ? "" : "is-out"}>
                      <img className="thumb" src={imageSrc(f.image)} alt="" loading="lazy" />
                      <div className="iv-name">
                        <strong><VegMark veg={f.isVeg !== false} />{f.name}</strong>
                        <small>{money(f.price)}{f.tag ? ` · ${f.tag}` : ""}</small>
                      </div>
                      <span className={`badge ${available ? "badge-green" : "badge-red"}`}><span className="dot" />{available ? "Available" : "Sold out"}</span>
                      <label className="switch">
                        <input type="checkbox" checked={available} disabled={!editable || busy.has(f._id)}
                          onChange={(e) => setAvailability([f._id], e.target.checked)} aria-label={`${f.name} available`} />
                        <span />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </div>
  );
};

export default Inventory;
