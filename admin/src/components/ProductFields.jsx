import React, { useEffect, useMemo, useState } from "react";
import { api, imageSrc } from "../lib/api";
import Icon from "./Icon";
import "./ProductFields.css";

// Fallback when the categories API isn't reachable (older backend).
const FALLBACK = ["Biryani", "Meals", "South Indian", "Starters", "Snacks", "Burgers & Pizza", "Rolls", "Sandwich", "Noodles", "Pasta", "Pure Veg", "Salad", "Cool Drinks", "Juices & Shakes", "Coffee & Tea", "Cake", "Deserts"];
export const TAGS = ["Bestseller", "New", "Chef's special", "Spicy", "Seasonal"];

// Category names from admin → Categories, in menu order.
export const useCategoryNames = () => {
  const [names, setNames] = useState(null);
  useEffect(() => {
    api.get("/api/admin/categories")
      .then((r) => setNames(r.data.data.map((c) => c.name)))
      .catch(() => setNames(FALLBACK));
  }, []);
  return names;
};

/** Veg/non-veg, badge and availability — the labels customers see on a dish. */
export const MenuLabels = ({ value, onChange }) => {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const custom = value.tag && !TAGS.includes(value.tag);
  return (
    <div className="pf-labels">
      <div className="field">
        <label>Diet</label>
        <div className="pf-diet" role="radiogroup" aria-label="Diet">
          <button type="button" role="radio" aria-checked={value.isVeg} className={value.isVeg ? "on veg" : ""} onClick={() => set("isVeg", true)}><i className="pf-mark veg" />Veg</button>
          <button type="button" role="radio" aria-checked={!value.isVeg} className={!value.isVeg ? "on nonveg" : ""} onClick={() => set("isVeg", false)}><i className="pf-mark nonveg" />Non-veg</button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pf-tag">Badge on the card</label>
        <select id="pf-tag" className="select" value={custom ? "__custom" : value.tag} onChange={(e) => set("tag", e.target.value === "__custom" ? " " : e.target.value)}>
          <option value="">None</option>
          {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value="__custom">Custom…</option>
        </select>
        {custom && <input className="input" style={{ marginTop: 6 }} maxLength={24} value={value.tag.trimStart()} onChange={(e) => set("tag", e.target.value)} placeholder="e.g. Kids' favourite" autoFocus />}
      </div>
      <label className="pf-avail">
        <span className="switch"><input type="checkbox" checked={value.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} /><span /></span>
        <span><strong>{value.isAvailable ? "Available to order" : "Sold out"}</strong><small>Switch off when the kitchen runs out.</small></span>
      </label>
    </div>
  );
};

const GROUPS = [
  { key: "crossSells", label: "Complete the meal", hint: "Sides, drinks and desserts suggested with this dish" },
  { key: "upsells", label: "Upgrades", hint: "Bigger or premium alternatives" },
  { key: "relatedProducts", label: "You may also like", hint: "Similar dishes" },
];

/** Searchable picker for the three kinds of linked dishes. value = { crossSells: [ids], upsells: [ids], relatedProducts: [ids] } */
export const LinkedDishes = ({ foods, value, onChange }) => {
  const [group, setGroup] = useState("crossSells");
  const [q, setQ] = useState("");
  const selected = value[group] || [];
  const byId = useMemo(() => Object.fromEntries(foods.map((f) => [f._id, f])), [foods]);
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    return foods.filter((f) => !selected.includes(f._id) && (!n || f.name.toLowerCase().includes(n) || f.category.toLowerCase().includes(n))).slice(0, 8);
  }, [foods, q, selected]);
  const toggle = (id) => onChange({ ...value, [group]: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] });
  const g = GROUPS.find((x) => x.key === group);

  return (
    <div className="pf-links">
      <div className="tabs" role="tablist">
        {GROUPS.map((x) => (
          <button type="button" key={x.key} role="tab" aria-selected={group === x.key} className={group === x.key ? "on" : ""} onClick={() => setGroup(x.key)}>
            {x.label}<span className="count">{(value[x.key] || []).length}</span>
          </button>
        ))}
      </div>
      <p className="field-hint">{g.hint}. Leave empty and the store picks suggestions automatically.</p>

      {selected.length > 0 && (
        <div className="pf-chosen">
          {selected.map((id) => byId[id] && (
            <span key={id} className="pf-chip">
              <img src={imageSrc(byId[id].image)} alt="" />{byId[id].name}
              <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${byId[id].name}`}><Icon name="close" size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="search">
        <Icon name="search" size={16} />
        <input className="input" placeholder="Search dishes to add…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes to link" />
      </div>
      <div className="pf-results">
        {results.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>{foods.length ? "No more dishes match." : "No other dishes yet."}</span>
          : results.map((f) => (
            <button type="button" key={f._id} className="pf-result" onClick={() => toggle(f._id)}>
              <img src={imageSrc(f.image)} alt="" />
              <span><strong>{f.name}</strong><small>{f.category} · ₹{f.price}</small></span>
              <Icon name="plus" size={16} />
            </button>
          ))}
      </div>
    </div>
  );
};

const slugify = (t) => String(t || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const Counter = ({ n, max, ideal }) => <span className={`pf-count ${n > max ? "over" : n >= ideal ? "good" : ""}`}>{n}/{max}</span>;

/** Search engine title + description with a live Google-style preview. value = { seoTitle, seoDescription } */
export const SeoFields = ({ value, onChange, name, description, slug }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const title = value.seoTitle.trim() || (name ? `${name} — Order online` : "Dish name — Order online");
  const desc = value.seoDescription.trim() || description || "The dish description is used when this is empty.";
  const storeUrl = (import.meta.env.VITE_STORE_URL || "https://yourstore.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div className="pf-seo">
      <div className="pf-serp" aria-label="Search result preview">
        <span className="pf-serp-url">{storeUrl} › dish › {slug || slugify(name) || "dish-name"}</span>
        <strong className="pf-serp-title">{title.length > 62 ? `${title.slice(0, 60)}…` : title}</strong>
        <span className="pf-serp-desc">{desc.length > 160 ? `${desc.slice(0, 158)}…` : desc}</span>
      </div>
      <div className="field">
        <label htmlFor="pf-seo-title">SEO title <Counter n={value.seoTitle.length} max={70} ideal={30} /></label>
        <input id="pf-seo-title" className="input" maxLength={70} value={value.seoTitle} onChange={set("seoTitle")} placeholder={name ? `e.g. ${name} | Order online for home delivery` : "e.g. Chicken Dum Biryani | Order online"} />
        <span className="field-hint">Shown as the clickable headline on Google and in the browser tab. 30–60 characters works best.</span>
      </div>
      <div className="field">
        <label htmlFor="pf-seo-desc">Meta description <Counter n={value.seoDescription.length} max={170} ideal={70} /></label>
        <textarea id="pf-seo-desc" className="textarea" rows={3} maxLength={170} value={value.seoDescription} onChange={set("seoDescription")}
          placeholder="One or two sentences that make someone want to order — mention taste, portion and delivery." />
        <span className="field-hint">Shown under the headline in search results. 70–160 characters works best.</span>
      </div>
    </div>
  );
};
