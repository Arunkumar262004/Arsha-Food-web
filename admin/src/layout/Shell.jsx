import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import ChangePassword from "./ChangePassword";
import { NAV } from "./nav";
import "./Shell.css";


const initials = (name = "") => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";

const readCollapsed = () => {
  try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
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
          <img src="/logo.png" alt="" className="sb-logo" />
          <div className="sb-brand-text">
            <strong>Inofex Restaurant</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="sb-nav">
          {sections.map((s) => (
            <div className="sb-section" key={s.section || "main"}>
              {s.section && <div className="sb-label">{s.section}</div>}
              {s.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className="sb-link" title={i.label}>
                  <Icon name={i.icon} size={20} />
                  <span>{i.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="avatar">{initials(admin?.name)}</div>
            <div className="sb-user-text">
              <strong>{admin?.name}</strong>
              <span>{admin?.role?.name}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="sb-scrim" onClick={() => setMobileOpen(false)} />

      <div className="main">
        <header className="hd">
          <button className="btn btn-ghost btn-icon" onClick={toggleSidebar} aria-label="Toggle navigation">
            <Icon name="menu" size={20} />
          </button>

          <div className="hd-pills">
            <span className={`pill ${online ? "pill-ok" : "pill-bad"}`} title={`Database ${status?.database || "unknown"}`}>
              <span className="pill-ring" />{online ? "Store online" : "Store offline"}
            </span>
            {status && (
              <span className={`pill hide-sm ${status.razorpay.configured ? "" : "pill-bad"}`} title="Payment gateway">
                Razorpay · {status.razorpay.configured ? (status.razorpay.mode === "live" ? "Live" : "Test mode") : "Not configured"}
              </span>
            )}
            {status && (
              <span className="pill hide-sm" title="Where product images are stored">
                Images · {status.storage.provider === "supabase" ? "Supabase" : "Local disk"}
              </span>
            )}
          </div>

          <div className="hd-right" ref={menuRef}>
            <span className="hd-date hide-sm">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button className="hd-profile" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
              <div className="avatar avatar-sm">{initials(admin?.name)}</div>
              <span className="hide-sm">{admin?.name}</span>
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
