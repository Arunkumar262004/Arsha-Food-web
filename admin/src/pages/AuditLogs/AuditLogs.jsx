import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { PageHead, Modal, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

const ACTION_BADGE = (a) =>
  /fail|delete/.test(a) ? "badge-red" : /login|logout/.test(a) ? "" : /create/.test(a) ? "badge-green" : "badge-blue";

const AuditLogs = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const limit = 25;

  useEffect(() => { document.title = "Audit logs · Inofex Restaurant Admin"; }, []);
  useEffect(() => { const t = setTimeout(() => { setQuery(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    setLoading(true);
    api.get("/api/admin/audit-logs", { params: { page, limit, q: query || undefined } })
      .then((r) => { setRows(r.data.data); setTotal(r.data.total); })
      .catch((err) => toast.error(errMsg(err, "Could not load audit logs")))
      .finally(() => setLoading(false));
  }, [page, query]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="page">
      <PageHead crumbs={["Administration", "Audit logs"]} title="Audit logs" sub="Every sign-in and change made in the admin console." />
      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 12 }}>
          <div className="search" style={{ maxWidth: 420 }}>
            <Icon name="search" size={18} />
            <input className="input" placeholder="Search by admin email, action or record ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit logs" />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Record</th><th>IP address</th><th></th></tr></thead>
            <tbody>
              {loading ? [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 36 }} /></td></tr>)
                : rows.length === 0 ? <tr><td colSpan={6}><Empty title="No activity recorded yet" /></td></tr>
                : rows.map((r) => (
                  <tr key={r._id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{dateTime(r.createdAt)}</td>
                    <td>{r.adminEmail || "—"}</td>
                    <td><span className={`badge ${ACTION_BADGE(r.action)}`}>{r.action}</span></td>
                    <td className="muted">{r.entity}{r.entityId ? ` · …${r.entityId.slice(-6)}` : ""}</td>
                    <td className="muted">{r.ip || "—"}</td>
                    <td className="right">
                      {(r.oldData || r.newData) && <button className="btn btn-ghost btn-sm" onClick={() => setDetail(r)}>Changes</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--border)", fontSize: 13 }}>
            <span className="muted">Page {page} of {pages} · {total} events</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <Modal size="lg" title={detail.action} onClose={() => setDetail(null)}>
          <p className="muted">{dateTime(detail.createdAt)} · {detail.adminEmail} · {detail.userAgent}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {[["Before", detail.oldData], ["After", detail.newData]].map(([label, d]) => (
              <div key={label}>
                <strong style={{ display: "block", marginBottom: 6 }}>{label}</strong>
                <pre style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, fontSize: 12, overflow: "auto", maxHeight: 360 }}>
                  {d ? JSON.stringify(d, null, 2) : "—"}
                </pre>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogs;
