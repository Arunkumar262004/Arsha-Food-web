import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { number, dateShort, timeAgo } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { PageHead, Empty, Segmented, ConfirmDialog } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";

const Subscribers = () => {
  const { can } = useAuth();
  const manage = can("notifications.manage");
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/api/admin/subscribers", { params: { status, q } })
    .then((r) => setData(r.data)).catch((err) => toast.error(errMsg(err, "Could not load subscribers")));
  useEffect(() => { document.title = "Subscribers · Inofex Restaurant Admin"; }, []);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  const toggle = async (s) => {
    try {
      const r = await api.put(`/api/admin/subscribers/${s._id}`, { isActive: !s.isActive });
      toast.success(r.data.message);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/admin/subscribers/${deleting._id}`);
      toast.success("Subscriber deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const c = data?.counts;
  return (
    <div className="page">
      <PageHead crumbs={["Marketing", "Subscribers"]} title="Subscribers" sub="People who signed up for offers through the newsletter box on your store.">
        <button className="btn btn-ghost" disabled={!data?.data.length}
          onClick={() => downloadCsv(`subscribers-${status}.csv`, ["Email", "Signed up", "Status", "Has account", "Source"],
            data.data.map((s) => [s.email, dateShort(s.createdAt), s.isActive ? "Subscribed" : "Unsubscribed", s.isCustomer ? "Yes" : "No", s.source]))}>
          <Icon name="download" size={16} />Export CSV
        </button>
      </PageHead>

      <div className="kpis">
        <div className="card kpi is-green"><span><i className="kpi-i"><Icon name="send" size={16} /></i>Subscribed</span><strong className="num">{c ? number(c.active) : "—"}</strong><small>will receive offer emails</small></div>
        <div className="card kpi is-gold"><span><i className="kpi-i"><Icon name="plus" size={16} /></i>New in 30 days</span><strong className="num">{c ? number(c.last30) : "—"}</strong></div>
        <div className="card kpi"><span><i className="kpi-i"><Icon name="close" size={16} /></i>Unsubscribed</span><strong className="num">{c ? number(c.unsubscribed) : "—"}</strong></div>
      </div>

      <div className="card">
        <div className="card-pad toolbar" style={{ paddingBottom: 16 }}>
          <div className="search">
            <Icon name="search" size={18} />
            <input className="input" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search subscribers" />
          </div>
          <Segmented value={status} onChange={setStatus} ariaLabel="Status" options={[
            { value: "active", label: "Subscribed" }, { value: "unsubscribed", label: "Unsubscribed" }, { value: "all", label: "All" },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Signed up</th><th>Customer account</th><th>Status</th>{manage && <th className="right">Actions</th>}</tr></thead>
            <tbody>
              {!data ? [0, 1, 2].map((i) => <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: 36 }} /></td></tr>)
                : data.data.length === 0 ? <tr><td colSpan={5}><Empty title={q ? "No one matches" : "No subscribers yet"}>{!q && "Sign-ups from the “Get 15% off” box in your store's footer appear here."}</Empty></td></tr>
                : data.data.map((s) => (
                  <tr key={s._id}>
                    <td><strong>{s.email}</strong></td>
                    <td className="muted" title={dateShort(s.createdAt)}>{timeAgo(s.createdAt)}</td>
                    <td>{s.isCustomer ? <span className="badge badge-blue">Has an account</span> : <span className="muted">—</span>}</td>
                    <td><span className={`badge ${s.isActive ? "badge-green" : ""}`}><span className="dot" />{s.isActive ? "Subscribed" : "Unsubscribed"}</span></td>
                    {manage && (
                      <td className="right" style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggle(s)}>{s.isActive ? "Unsubscribe" : "Resubscribe"}</button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 6 }} onClick={() => setDeleting(s)} aria-label={`Delete ${s.email}`}><Icon name="trash" size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog danger busy={busy} title="Delete this subscriber?" confirmLabel="Delete"
          message={`${deleting.email} will be removed completely. Use this for data-deletion requests; otherwise "Unsubscribe" keeps a record so they aren't emailed by mistake.`}
          onConfirm={remove} onClose={() => !busy && setDeleting(null)} />
      )}
    </div>
  );
};

export default Subscribers;
