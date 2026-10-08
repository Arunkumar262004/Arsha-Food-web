import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { PageHead, Empty, Segmented, ConfirmDialog } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Emails.css";

const LOG_BADGE = { sent: "badge-green", failed: "badge-red", skipped: "badge-amber" };

const Editor = ({ tpl, canManage, adminEmail, onSaved }) => {
  const [draft, setDraft] = useState(tpl);
  const [view, setView] = useState("preview");
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState(adminEmail || "");
  const [testing, setTesting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const htmlRef = useRef(null);
  const dirty = draft.subject !== tpl.subject || draft.html !== tpl.html || draft.text !== tpl.text;

  useEffect(() => { setDraft(tpl); }, [tpl]);

  // Live preview with sample data (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      api.post("/api/admin/email-templates/preview", { subject: draft.subject, html: draft.html, text: draft.text })
        .then((r) => setPreview(r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [draft.subject, draft.html, draft.text]);

  const save = async (patch) => {
    setSaving(true);
    try {
      await api.put(`/api/admin/email-templates/${tpl.key}`, patch || { subject: draft.subject, html: draft.html, text: draft.text });
      toast.success(patch ? (patch.isActive ? "Email enabled" : "Email disabled") : "Template saved");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await api.post("/api/admin/email-templates/test", { key: tpl.key, to: testTo, subject: draft.subject, html: draft.html, text: draft.text });
      toast.success(r.data.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setTesting(false);
    }
  };

  const reset = async () => {
    try {
      await api.post(`/api/admin/email-templates/${tpl.key}/reset`);
      toast.success("Template restored to default");
      setResetOpen(false);
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  // Insert {{variable}} at the cursor in the HTML editor.
  const insertVar = (v) => {
    const token = `{{${v}}}`;
    const el = htmlRef.current;
    if (view !== "html" || !el) {
      navigator.clipboard?.writeText(token);
      toast.info(`Copied ${token}`);
      return;
    }
    const { selectionStart: s, selectionEnd: e } = el;
    const html = draft.html.slice(0, s) + token + draft.html.slice(e);
    setDraft((d) => ({ ...d, html }));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length; });
  };

  return (
    <div className="card em-editor">
      <div className="em-editor-head">
        <div style={{ minWidth: 0 }}>
          <div className="card-title">{tpl.name}</div>
          <div className="card-sub">{tpl.description}</div>
        </div>
        <label className={`switch ${!canManage ? "disabled" : ""}`} title={tpl.isActive ? "Customers receive this email" : "This email is not sent"}>
          <input type="checkbox" checked={tpl.isActive} disabled={!canManage || saving} onChange={(e) => save({ isActive: e.target.checked })} />
          <span className="switch-track"><span /></span>
          <span>{tpl.isActive ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="em-body">
        <div className="field">
          <label htmlFor="em-subj">Subject</label>
          <input id="em-subj" className="input" value={draft.subject} disabled={!canManage}
            onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
        </div>

        <div className="em-vars">
          <span className="muted">Variables</span>
          {tpl.variables.map((v) => (
            <button key={v} type="button" className="chip" onClick={() => insertVar(v)} title={view === "html" ? "Insert at cursor" : "Copy"}>{`{{${v}}}`}</button>
          ))}
        </div>

        <div className="em-tabs">
          <Segmented value={view} onChange={setView} ariaLabel="Editor view" options={[
            { value: "preview", label: "Preview" }, { value: "html", label: "HTML" }, { value: "text", label: "Plain text" },
          ]} />
          {preview && view === "preview" && <span className="muted em-subject-preview">Subject: <strong>{preview.subject}</strong></span>}
        </div>

        {view === "preview" && (
          // sandbox with no permissions: template HTML can't run scripts in the admin
          <iframe className="em-frame" title="Email preview" sandbox="" srcDoc={preview?.html || ""} />
        )}
        {view === "html" && (
          <textarea ref={htmlRef} className="textarea em-code" value={draft.html} disabled={!canManage} spellCheck={false}
            onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))} aria-label="HTML body" />
        )}
        {view === "text" && (
          <textarea className="textarea em-code" value={draft.text} disabled={!canManage}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} aria-label="Plain text fallback"
            placeholder="Shown by email apps that don't display HTML" />
        )}
      </div>

      {canManage && (
        <div className="em-foot">
          <div className="em-test">
            <input className="input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" aria-label="Send test to" />
            <button className="btn btn-outline" onClick={sendTest} disabled={testing || !testTo}>{testing ? <span className="spinner" style={{ borderColor: "var(--primary-soft-2)", borderTopColor: "var(--primary)" }} /> : <Icon name="mail" size={16} />}Send test</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setResetOpen(true)}>Restore default</button>
            <button className="btn btn-ghost" onClick={() => setDraft(tpl)} disabled={!dirty}>Discard</button>
            <button className="btn btn-primary" onClick={() => save()} disabled={!dirty || saving}>{saving && <span className="spinner" />}Save</button>
          </div>
        </div>
      )}
      {resetOpen && <ConfirmDialog title="Restore default template?" confirmLabel="Restore"
        message="Your changes to this email's subject and body will be replaced with the built-in version."
        onConfirm={reset} onClose={() => setResetOpen(false)} />}
    </div>
  );
};

const EmailLog = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  useEffect(() => {
    setLoading(true);
    api.get("/api/admin/email-logs", { params: { page, limit, status: status || undefined } })
      .then((r) => { setRows(r.data.data); setTotal(r.data.total); })
      .catch((err) => toast.error(errMsg(err)))
      .finally(() => setLoading(false));
  }, [page, status]);

  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="card">
      <div className="card-pad" style={{ paddingBottom: 12 }}>
        <div className="tabs">
          {[["", "All"], ["sent", "Sent"], ["failed", "Failed"], ["skipped", "Skipped"]].map(([v, l]) => (
            <button key={v} className={status === v ? "on" : ""} onClick={() => { setStatus(v); setPage(1); }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>To</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? [0, 1, 2].map((i) => <tr key={i}><td colSpan={4}><div className="skeleton" style={{ height: 36 }} /></td></tr>)
              : rows.length === 0 ? <tr><td colSpan={4}><Empty title="No emails yet" /></td></tr>
              : rows.map((r) => (
                <tr key={r._id}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{dateTime(r.createdAt)}</td>
                  <td>{r.to}</td>
                  <td><div>{r.subject || "—"}</div><div className="muted" style={{ fontSize: 12 }}>{r.template}</div></td>
                  <td>
                    <span className={`badge ${LOG_BADGE[r.status]}`}>{r.status}</span>
                    {r.error && <div className="muted" style={{ fontSize: 12, marginTop: 4, maxWidth: 320 }}>{r.error}</div>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <span className="muted">Page {page} of {pages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Emails = ({ tab = "templates" }) => {
  const { can, admin } = useAuth();
  const canManage = can("notifications.manage");
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/api/admin/email-templates");
      setTemplates(r.data.data);
      setSelected((s) => s || r.data.data[0]?.key);
    } catch (err) {
      toast.error(errMsg(err, "Could not load templates"));
    }
  }, []);

  useEffect(() => {
    document.title = "Emails · Inofex Restaurant Admin";
    load();
    api.get("/api/admin/email-status").then((r) => setStatus(r.data.data)).catch(() => {});
  }, [load]);

  const tpl = templates.find((t) => t.key === selected);

  return (
    <div className="page">
      <PageHead crumbs={["Notifications", tab === "log" ? "Email log" : "Email templates"]}
        title={tab === "log" ? "Email log" : "Email templates"}
        sub={tab === "log" ? "Every email the store has tried to send." : "Emails customers receive automatically. Edit the wording, preview, and send yourself a test."}>
        {status && (
          <span className={`pill ${status.connected ? "pill-ok" : "pill-bad"}`} title={status.message}>
            <span className="pill-ring" />{status.connected ? `SMTP connected · ${status.from}` : `SMTP: ${status.message}`}
          </span>
        )}
      </PageHead>

      {tab === "log" ? <EmailLog /> : (
        <div className="em-layout">
          <div className="card em-list">
            {templates.map((t) => (
              <button key={t.key} className={`em-item ${selected === t.key ? "on" : ""}`} onClick={() => setSelected(t.key)}>
                <span className={`em-dot ${t.isActive ? "on" : ""}`} aria-label={t.isActive ? "Enabled" : "Disabled"} />
                <span className="em-item-text"><strong>{t.name}</strong><small>{t.description}</small></span>
              </button>
            ))}
          </div>
          {tpl ? <Editor key={tpl.key} tpl={tpl} canManage={canManage} adminEmail={admin?.email} onSaved={load} />
            : <div className="card card-pad"><Empty title="No templates" /></div>}
        </div>
      )}
    </div>
  );
};

export default Emails;
