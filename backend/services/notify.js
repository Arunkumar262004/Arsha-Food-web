import EmailTemplate from "../models/EmailTemplatemodel.js";
import EmailLog from "../models/EmailLogmodel.js";
import userModel from "../models/User-model.js";
import { sendMail, isMailConfigured } from "./mailer.js";
import { renderTemplate, STATUS_TEMPLATES } from "./emailTemplates.js";

const money = (n) => "₹" + (Number(n) || 0).toFixed(2);

export const baseVars = () => ({
    store_name: process.env.MAIL_FROM_NAME || "Inofex Restaurant",
    store_url: process.env.FRONTEND_URL || "http://localhost:5173",
});

const orderVars = (order, customerName) => {
    const items = order.items || [];
    return {
        ...baseVars(),
        customer_name: customerName || order.address?.firstName || "there",
        order_number: order.orderNumber || `#${String(order._id).slice(-6).toUpperCase()}`,
        order_total: money(order.amount),
        order_items: items.map((i) => `${i.name} × ${i.quantity}`).join(", "),
        order_items_html: items.map((i) => `${escape(i.name)} × ${i.quantity} — ${money(i.price * i.quantity)}`).join("<br>"),
        order_status: order.status,
        order_url: `${baseVars().store_url}/myorders`,
        discount: money(order.discount),
        coupon_code: order.couponCode || "",
    };
};

const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * Render + send a template. Never throws: email problems must not break checkout or admin actions.
 * Every attempt is written to EmailLog (without any credentials).
 */
export const sendTemplate = async (key, to, vars, meta = {}) => {
    const log = (status, extra) => EmailLog.create({ template: key, to: to || "—", status, ...meta, ...extra }).catch(() => {});
    try {
        if (!to) return log("skipped", { error: "No recipient email" });
        const tpl = await EmailTemplate.findOne({ key }).lean();
        if (!tpl) return log("skipped", { error: "Template not found" });
        if (!tpl.isActive) return log("skipped", { subject: tpl.subject, error: "Template disabled" });
        if (!isMailConfigured()) return log("skipped", { error: "SMTP not configured" });

        const all = { ...baseVars(), ...vars };
        const subject = renderTemplate(tpl.subject, all, { html: false });
        const messageId = await sendMail({
            to, subject,
            html: renderTemplate(tpl.html, all),
            text: renderTemplate(tpl.text, all, { html: false }),
        });
        return log("sent", { subject, messageId });
    } catch (err) {
        console.error(`Email "${key}" to ${to} failed:`, err.message);
        return log("failed", { error: err.message });
    }
};

// Fire-and-forget so the HTTP response is never delayed by SMTP.
const later = (fn) => setImmediate(() => fn().catch((e) => console.error("Notify error:", e.message)));

const recipientFor = async (order) => {
    if (order.address?.email) return { email: order.address.email, name: order.address.firstName };
    const user = await userModel.findById(order.userId, { email: 1, name: 1 }).lean().catch(() => null);
    return { email: user?.email, name: user?.name };
};

export const notifyOrder = (order, key) => later(async () => {
    const { email, name } = await recipientFor(order);
    await sendTemplate(key, email, orderVars(order, name), { entity: "order", entityId: String(order._id) });
});

export const notifyStatusChange = (order) => {
    const key = STATUS_TEMPLATES[order.status];
    if (key) notifyOrder(order, key);
};

export const notifyWelcome = (user) => later(() =>
    sendTemplate("welcome", user.email, { customer_name: user.name }, { entity: "user", entityId: String(user._id) }));

export { orderVars };
