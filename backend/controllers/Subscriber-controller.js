import validator from "validator";
import Subscriber from "../models/Subscribermodel.js";
import UserModel from "../models/User-model.js";
import { audit } from "../services/audit.js";

// POST /api/subscribe  { email } — storefront newsletter form
export const subscribe = async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: "Enter a valid email address" });
    const existing = await Subscriber.findOne({ email });
    if (existing?.isActive) return res.json({ success: true, message: "You're already subscribed" });
    if (existing) { existing.isActive = true; await existing.save(); }
    else await Subscriber.create({ email, source: String(req.body.source || "footer").slice(0, 30) });
    res.json({ success: true, message: "You're subscribed!" });
};

// GET /api/admin/subscribers?q=&status=active|unsubscribed|all
export const listSubscribers = async (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "active");
    const filter = {};
    if (status === "active") filter.isActive = true;
    else if (status === "unsubscribed") filter.isActive = false;
    if (q) filter.email = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [rows, active, unsubscribed, last30] = await Promise.all([
        Subscriber.find(filter).sort({ createdAt: -1 }).limit(2000).lean(),
        Subscriber.countDocuments({ isActive: true }),
        Subscriber.countDocuments({ isActive: false }),
        Subscriber.countDocuments({ isActive: true, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    ]);
    // Flag subscribers who also have a customer account.
    const accounts = new Set((await UserModel.find({ email: { $in: rows.map((r) => r.email) } }, { email: 1 }).lean()).map((u) => u.email.toLowerCase()));
    res.json({
        success: true, counts: { active, unsubscribed, last30 },
        data: rows.map((r) => ({ ...r, isCustomer: accounts.has(r.email) })),
    });
};

// PUT /api/admin/subscribers/:id  { isActive }
export const updateSubscriber = async (req, res) => {
    const sub = await Subscriber.findById(req.params.id).catch(() => null);
    if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });
    sub.isActive = req.body.isActive === true || req.body.isActive === "true";
    await sub.save();
    audit(req, { action: sub.isActive ? "subscriber.resubscribe" : "subscriber.unsubscribe", entity: "subscriber", entityId: sub._id, newData: { email: sub.email } });
    res.json({ success: true, message: sub.isActive ? "Subscribed again" : "Unsubscribed" });
};

// DELETE /api/admin/subscribers/:id — removes the address entirely (e.g. on a data-deletion request)
export const deleteSubscriber = async (req, res) => {
    const sub = await Subscriber.findByIdAndDelete(req.params.id).catch(() => null);
    if (!sub) return res.status(404).json({ success: false, message: "Subscriber not found" });
    audit(req, { action: "subscriber.delete", entity: "subscriber", entityId: sub._id, oldData: { email: sub.email } });
    res.json({ success: true, message: "Subscriber deleted" });
};
