import validator from "validator";
import EmailTemplate from "../models/EmailTemplatemodel.js";
import EmailLog from "../models/EmailLogmodel.js";
import { audit } from "../services/audit.js";
import { renderTemplate, SAMPLE_VARS, DEFAULT_TEMPLATES } from "../services/emailTemplates.js";
import { sendMail, verifyMail, isMailConfigured, fromAddress } from "../services/mailer.js";
import { baseVars } from "../services/notify.js";

const sample = () => ({ ...baseVars(), order_url: `${baseVars().store_url}/myorders`, ...SAMPLE_VARS });

// GET /api/admin/email-templates
export const listTemplates = async (req, res) => {
    const rows = await EmailTemplate.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: rows });
};

// PUT /api/admin/email-templates/:key   { subject?, html?, text?, isActive? }
export const updateTemplate = async (req, res) => {
    const tpl = await EmailTemplate.findOne({ key: req.params.key });
    if (!tpl) return res.status(404).json({ success: false, message: "Template not found" });
    const before = { subject: tpl.subject, isActive: tpl.isActive };
    const { subject, html, text, isActive } = req.body;
    if (subject !== undefined) {
        if (!String(subject).trim()) return res.status(400).json({ success: false, message: "Subject is required" });
        tpl.subject = String(subject).slice(0, 300);
    }
    if (html !== undefined) {
        if (!String(html).trim()) return res.status(400).json({ success: false, message: "HTML body is required" });
        tpl.html = String(html).slice(0, 200000);
    }
    if (text !== undefined) tpl.text = String(text).slice(0, 50000);
    if (isActive !== undefined) tpl.isActive = !!isActive;
    await tpl.save();
    audit(req, { action: "email_template.update", entity: "email_template", entityId: tpl.key, oldData: before, newData: { subject: tpl.subject, isActive: tpl.isActive } });
    res.json({ success: true, message: "Template saved" });
};

// POST /api/admin/email-templates/:key/reset — restore the built-in version
export const resetTemplate = async (req, res) => {
    const def = DEFAULT_TEMPLATES.find((t) => t.key === req.params.key);
    if (!def) return res.status(404).json({ success: false, message: "No default for this template" });
    await EmailTemplate.updateOne({ key: def.key }, { $set: { subject: def.subject, html: def.html, text: def.text, variables: def.variables } });
    audit(req, { action: "email_template.reset", entity: "email_template", entityId: def.key });
    res.json({ success: true, message: "Template restored to default" });
};

// POST /api/admin/email-templates/preview  { subject, html, text } → rendered with sample data
export const previewTemplate = (req, res) => {
    const vars = sample();
    res.json({
        success: true,
        subject: renderTemplate(req.body.subject, vars, { html: false }),
        html: renderTemplate(req.body.html, vars),
        text: renderTemplate(req.body.text, vars, { html: false }),
    });
};

// POST /api/admin/email-templates/test  { to, subject, html, text } — sends the (unsaved) draft with sample data
export const sendTestEmail = async (req, res) => {
    const to = String(req.body.to || "").trim();
    if (!validator.isEmail(to)) return res.status(400).json({ success: false, message: "Enter a valid email address" });
    if (!isMailConfigured()) return res.status(400).json({ success: false, message: "SMTP is not configured on the server" });
    const vars = sample();
    const subject = "[Test] " + renderTemplate(req.body.subject, vars, { html: false });
    try {
        const messageId = await sendMail({
            to, subject,
            html: renderTemplate(req.body.html, vars),
            text: renderTemplate(req.body.text, vars, { html: false }),
        });
        await EmailLog.create({ template: req.body.key || "test", to, subject, status: "sent", messageId });
        audit(req, { action: "email.test", entity: "email_template", entityId: req.body.key, newData: { to } });
        res.json({ success: true, message: `Test email sent to ${to}` });
    } catch (err) {
        await EmailLog.create({ template: req.body.key || "test", to, subject, status: "failed", error: err.message });
        res.status(502).json({ success: false, message: `Sending failed: ${err.message}` });
    }
};

// GET /api/admin/email-status — SMTP connection check (no secrets returned)
export const emailStatus = async (req, res) => {
    const r = await verifyMail();
    res.json({ success: true, data: { configured: isMailConfigured(), connected: r.ok, message: r.message, from: isMailConfigured() ? fromAddress() : null } });
};

// GET /api/admin/email-logs?page&limit&status&q
export const listEmailLogs = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const filter = {};
    if (["sent", "failed", "skipped"].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.q) {
        const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ to: rx }, { subject: rx }, { template: rx }];
    }
    const [rows, total] = await Promise.all([
        EmailLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        EmailLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: rows, page, limit, total });
};
