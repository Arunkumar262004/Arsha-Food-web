import Sale from "../models/Salemodel.js";
import SaleSignup from "../models/SaleSignupmodel.js";
import { sendTemplate, baseVars } from "./notify.js";

const money = (n) => "₹" + (Number(n) || 0).toFixed(0);

/** Live sale price per dish id: Map<foodId, { price, saleId, saleName, endsAt }>. Overlapping sales → lowest price wins. */
export const liveSalePrices = async (now = new Date()) => {
    const sales = await Sale.find({ isActive: true, startsAt: { $lte: now }, endsAt: { $gt: now } }, { name: 1, endsAt: 1, items: 1 }).lean();
    const map = new Map();
    for (const s of sales) for (const it of s.items) {
        const id = String(it.food);
        const cur = map.get(id);
        if (!cur || it.salePrice < cur.price) map.set(id, { price: it.salePrice, saleId: String(s._id), saleName: s.name, endsAt: s.endsAt });
    }
    return map;
};

/** Returns plain dish objects with the live sale price applied: price = sale price, mrp = regular price. */
export const withSalePricing = async (foods) => {
    const prices = await liveSalePrices();
    return foods.map((f) => {
        const obj = typeof f.toObject === "function" ? f.toObject() : { ...f };
        const live = prices.get(String(obj._id));
        if (!live || !(live.price < obj.price)) return obj;
        return { ...obj, mrp: obj.price, price: live.price, sale: { id: live.saleId, name: live.saleName, endsAt: live.endsAt } };
    });
};

const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: process.env.STORE_TIMEZONE || "Asia/Kolkata" });

/**
 * Email everyone who asked to be told when this sale starts (skips people already emailed).
 * Returns { sent, total }. Email failures are logged in the Email Log, never thrown.
 */
export const emailSaleSignups = async (saleId) => {
    const sale = await Sale.findById(saleId).populate("items.food", "name price").lean();
    if (!sale) return { sent: 0, total: 0 };
    const pending = await SaleSignup.find({ sale: sale._id, notifiedAt: null }).lean();
    const items = sale.items.filter((i) => i.food).slice(0, 6);
    const vars = {
        sale_name: sale.name,
        sale_tagline: sale.tagline || "",
        sale_ends: fmtDate(sale.endsAt),
        sale_url: `${baseVars().store_url}/#sale`,
        sale_items: items.map((i) => `${i.food.name} — ${money(i.salePrice)} (was ${money(i.food.price)})`).join(", "),
        sale_items_html: items.map((i) => `${escapeHtml(i.food.name)} — <strong>${money(i.salePrice)}</strong> <s style="color:#9a8676">${money(i.food.price)}</s>`).join("<br>"),
    };
    let sent = 0;
    for (const s of pending) {
        await sendTemplate("sale_started", s.email, { ...vars, customer_name: s.name || "there" }, { entity: "sale", entityId: String(sale._id) });
        await SaleSignup.updateOne({ _id: s._id }, { $set: { notifiedAt: new Date() } });
        sent++;
    }
    return { sent, total: pending.length };
};

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Every minute: when a sale goes live, email its sign-ups once. The claim is atomic, so it runs once even with several servers. */
export const startSaleWatcher = () => {
    const tick = async () => {
        try {
            const now = new Date();
            for (;;) {
                const sale = await Sale.findOneAndUpdate(
                    { isActive: true, startsAt: { $lte: now }, endsAt: { $gt: now }, startEmailSentAt: null },
                    { $set: { startEmailSentAt: now } }, { new: true });
                if (!sale) break;
                const r = await emailSaleSignups(sale._id);
                console.log(`Sale "${sale.name}" is live — emailed ${r.sent} sign-up(s)`);
            }
        } catch (err) {
            console.error("Sale watcher:", err.message);
        }
    };
    tick();
    return setInterval(tick, 60 * 1000);
};
