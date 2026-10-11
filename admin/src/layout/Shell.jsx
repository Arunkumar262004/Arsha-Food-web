import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import ChangePassword from "./ChangePassword";
import { NAV } from "./nav";
import "./Shell.css";

const STORE_URL = import.meta.env.VITE_STORE_URL;

const initials = (name = "") => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";

const readCollapsed = () => {
  try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const Shell = ({ children }) => {
  const { admin, logout, can } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0"); } catch { /* storage unavailable */ }
  }, [collapsed]);

  useEffect(() => {
    api.get("/api/admin/system-status").then((r) => setStatus(r.data.data)).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    const onDoc = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  const sections = NAV
    .map((s) => ({ ...s, items: s.items.filter((i) => can(i.perm)) }))
    .filter((s) => s.items.length);

  const online = status?.database === "connected";

  return (
    <div className={`shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
      <aside className="sb" aria-label="Main navigation">
        <div className="sb-brand">
          <span className="sb-logo"><img src="/logo.png" alt="" /></span>
          <div className="sb-brand-text">
            <strong>Inofex Restaurant</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav className="sb-nav">
          {sections.map((s) => (
            <div className="sb-section" key={s.section || "main"}>
              {s.section && <div className="sb-label">{s.section}</div>}
              {s.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className="sb-link" title={collapsed ? i.label : undefined}>
                  <Icon name={i.icon} size={19} />
                  <span>{i.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className={`sb-status ${online ? "ok" : "bad"}`} title={`Database ${status?.database || "unknown"}`}>
            <span className="sb-status-dot" />
            <span className="sb-status-text">{online ? "All systems running" : status ? "Database offline" : "Checking…"}</span>
          </div>
        </div>
      </aside>
      <div className="sb-scrim" onClick={() => setMobileOpen(false)} />

      <div className="main">
        <header className="hd">
          <button className="hd-burger" onClick={toggleSidebar} aria-label="Toggle navigation">
            <Icon name="menu" size={20} />
          </button>

          <div className="hd-hello hide-sm">
            <strong>{greeting()}, {admin?.name?.split(" ")[0] || "there"}</strong>
            <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>

          <div className="hd-right" ref={menuRef}>
            {status && (
              <div className="hd-chips hide-md">
                <span className={`chip-status ${status.razorpay.configured ? (status.razorpay.mode === "live" ? "ok" : "warn") : "bad"}`} title="Payment gateway">
                  <Icon name="rupee" size={14} />Razorpay · {status.razorpay.configured ? (status.razorpay.mode === "live" ? "Live" : "Test") : "Not set up"}
                </span>
                <span className="chip-status" title="Where product images are stored">
                  <Icon name="image" size={14} />{status.storage.provider === "supabase" ? "Supabase" : "Local disk"}
                </span>
              </div>
            )}
            {STORE_URL && (
              <a href={STORE_URL} target="_blank" rel="noreferrer" className="btn btn-ghost hd-store">
                <Icon name="eye" size={16} /><span className="hide-sm">View store</span>
              </a>
            )}
            <button className="hd-profile" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <div className="avatar avatar-sm">{initials(admin?.name)}</div>
              <span className="hd-profile-text hide-sm">
                <strong>{admin?.name}</strong>
                <small>{admin?.role?.name}</small>
              </span>
              <Icon name="chevronDown" size={16} />
            </button>
            {menuOpen && (
              <div className="hd-menu" role="menu">
                <div className="hd-menu-head">
                  <strong>{admin?.name}</strong>
                  <span>{admin?.email}</span>
                </div>
                <button role="menuitem" onClick={() => { setPwOpen(true); setMenuOpen(false); }}>
                  <Icon name="key" size={16} /> Change password
                </button>
                <button role="menuitem" onClick={() => logout()} className="danger">
                  <Icon name="logout" size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  );
};

export default Shell;
