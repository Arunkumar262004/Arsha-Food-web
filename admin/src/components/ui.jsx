import React, { useEffect } from "react";
import Icon from "./Icon";

// ▲ 12.5% / ▼ 4.2% — red/green triangle deltas as in the trading reference.
export const Delta = ({ value, suffix = "%", invert = false, label }) => {
  if (value === null || value === undefined || !isFinite(value)) {
    return <span className="delta flat">— {label}</span>;
  }
  const good = invert ? value < 0 : value > 0;
  const cls = value === 0 ? "flat" : good ? "up" : "down";
  return (
    <span className={`delta ${cls}`}>
      {value !== 0 && (
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
          <path d={value > 0 ? "M5 1 9.5 9h-9z" : "M5 9 .5 1h9z"} fill="currentColor" />
        </svg>
      )}
      {Math.abs(value)}{suffix}
      {label && <span className="muted" style={{ fontWeight: 500 }}>{label}</span>}
    </span>
  );
};

export const Segmented = ({ options, value, onChange, ariaLabel }) => (
  <div className="seg" role="tablist" aria-label={ariaLabel}>
    {options.map((o) => (
      <button key={o.value} role="tab" aria-selected={value === o.value}
        className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Modal = ({ title, onClose, children, footer, size, drawer }) => {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={`overlay ${drawer ? "right" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={drawer ? "drawer" : `modal ${size === "lg" ? "modal-lg" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ title, message, confirmLabel = "Confirm", danger, busy, onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose} footer={<>
    <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
    <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
      {busy && <span className="spinner" />}{confirmLabel}
    </button>
  </>}>
    <p style={{ color: "var(--ink-2)", lineHeight: 1.55 }}>{message}</p>
  </Modal>
);

export const PageHead = ({ crumbs = [], title, sub, children }) => (
  <div className="page-head">
    <div>
      {crumbs.length > 0 && (
        <div className="crumbs">
          {crumbs.map((c, i) => <React.Fragment key={c}>{i > 0 && <span>/</span>}<span>{c}</span></React.Fragment>)}
        </div>
      )}
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
    </div>
    {children && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{children}</div>}
  </div>
);

export const Empty = ({ title, children }) => (
  <div className="empty"><strong>{title}</strong>{children}</div>
);

// Order status → badge colour. Status colours always ship with a text label.
const STATUS_BADGE = {
  "Payment Pending": "badge-amber",
  "Food Processing": "badge-blue",
  "Out for Delivery": "badge-purple",
  "Delivered": "badge-green",
  "Cancelled": "badge-red",
  "Payment Failed": "badge-red",
};
export const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_BADGE[status] || ""}`}><span className="dot" />{status || "—"}</span>
);

export const PaymentBadge = ({ paid, status }) => {
  const s = paid ? "paid" : status || "pending";
  const cls = s === "paid" ? "badge-green" : s === "failed" ? "badge-red" : "badge-amber";
  return <span className={`badge ${cls}`}>{s[0].toUpperCase() + s.slice(1)}</span>;
};
