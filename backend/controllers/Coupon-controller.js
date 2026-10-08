import validator from "validator";
import Coupon from "../models/Couponmodel.js";
import CouponUsage from "../models/CouponUsagemodel.js";
import userModel from "../models/User-model.js";
import { audit } from "../services/audit.js";
import { sendTemplate } from "../services/notify.js";

const num = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));
const date = (v) => (v ? new Date(v) : undefined);

// Validates and normalises the admin form. Returns { data } or { error }.
const parseCoupon = (b) => {
    const code = String(b.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Code must be 3–30 letters, numbers, - or _" };
    if (!["percentage", "fixed", "free_shipping"].includes(b.type)) return { error: "Choose a discount type" };

    const value = num(b.value) ?? 0;
    if (b.type === "percentage" && !(value > 0 && value <= 100)) return { error: "Percentage must be between 1 and 100" };
    if (b.type === "fixed" && !(value > 0)) return { error: "Discount amount must be greater than 0" };

    const data = {
        code,
        description: String(b.description || "").slice(0, 300),
        type: b.type,
        value: b.type === "free_shipping" ? 0 : value,
        maxDiscount: b.type === "percentage" ? num(b.maxDiscount) : undefined,
        minOrderAmount: num(b.minOrderAmount) || 0,
        firstOrderOnly: !!b.firstOrderOnly,
        applicableProducts: Array.isArray(b.applicableProducts) ? b.applicableProducts.map(String) : [],
        applicableCategories: Array.isArray(b.applicableCategories) ? b.applicableCategories.map(String) : [],
        allowedCustomers: (Array.isArray(b.allowedCustomers) ? b.allowedCustomers : String(b.allowedCustomers || "").split(/[\s,;]+/))
            .map((e) => String(e).trim().toLowerCase()).filter(Boolean),
        usageLimit: num(b.usageLimit) || undefined,
        perCustomerLimit: num(b.perCustomerLimit) ?? 1,
        startsAt: date(b.startsAt),
        expiresAt: date(b.expiresAt),
        isActive: b.isActive !== false,
    };
    const bad = data.allowedCustomers.find((e) => !validator.isEmail(e));
    if (bad) return { error: `"${bad}" is not a valid email` };
    for (const k of ["maxDiscount", "minOrderAmount", "usageLimit", "perCustomerLimit"]) {
        if (data[k] !== undefined && (isNaN(data[k]) || data[k] < 0)) return { error: `${k} must be a positive number` };
    }
    if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) return { error: "Expiry must be after the start date" };
    return { data };
};

// GET /api/admin/coupons
export const listCoupons = async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const totals = await CouponUsage.aggregate([{ $group: { _id: "$coupon", discount: { $sum: "$discount" } } }]);
    const byId = Object.fromEntries(totals.map((t) => [String(t._id), t.discount]));
    res.json({ success: true, data: coupons.map((c) => ({ ...c, totalDiscount: byId[String(c._id)] || 0 })) });
};

// POST /api/admin/coupons
export const createCoupon = async (req, res) => {
    const { data, error } = parseCoupon(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (await Coupon.exists({ code: data.code })) return res.status(409).json({ success: false, message: "A coupon with this code already exists" });
    const coupon = await Coupon.create(data);
    audit(req, { action: "coupon.create", entity: "coupon", entityId: coupon._id, newData: data });
    res.status(201).json({ success: true, message: "Coupon created", data: coupon });
};

// PUT /api/admin/coupons/:id
export const updateCoupon = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).catch(() => null);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    const { data, error } = parseCoupon({ ...coupon.toObject(), ...req.body });
    if (error) return res.status(400).json({ success: false, message: error });
    if (data.code !== coupon.code && await Coupon.exists({ code: data.code })) {
        return res.status(409).json({ success: false, message: "A coupon with this code already exists" });
    }
    const before = coupon.toObject();
    // Optional fields cleared in the form must be unset, not left at their old value.
    for (const k of ["maxDiscount", "usageLimit", "startsAt", "expiresAt"]) if (data[k] === undefined) coupon[k] = undefined;
    Object.assign(coupon, data);
    await coupon.save();
    audit(req, { action: "coupon.update", entity: "coupon", entityId: coupon._id, oldData: before, newData: data });
    res.json({ success: true, message: "Coupon updated" });
};

// DELETE /api/admin/coupons/:id — coupons with redemptions are deactivated to keep history.
export const deleteCoupon = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).catch(() => null);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    if (await CouponUsage.exists({ coupon: coupon._id })) {
        coupon.isActive = false;
        await coupon.save();
        audit(req, { action: "coupon.deactivate", entity: "coupon", entityId: coupon._id });
        return res.json({ success: true, message: "Coupon has been used, so it was deactivated instead of deleted" });
    }
    await coupon.deleteOne();
    audit(req, { action: "coupon.delete", entity: "coupon", entityId: coupon._id, oldData: coupon.toObject() });
    res.json({ success: true, message: "Coupon deleted" });
};

// GET /api/admin/coupons/:id/usages
export const couponUsages = async (req, res) => {
    const rows = await CouponUsage.find({ coupon: req.params.id }).sort({ usedAt: -1 }).limit(200).lean();
    const users = await userModel.find({ _id: { $in: rows.map((r) => r.userId).filter((id) => /^[a-f0-9]{24}$/.test(id)) } }, { name: 1, email: 1 }).lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
    res.json({ success: true, data: rows.map((r) => ({ ...r, customer: byId[r.userId] || null })) });
};

const offerText = (c) =>
    c.type === "percentage" ? `${c.value}% off${c.maxDiscount ? ` (up to ₹${c.maxDiscount})` : ""}`
        : c.type === "fixed" ? `₹${c.value} off`
        : "free delivery";

// POST /api/admin/coupons/:id/send  { audience: "all" | "emails", emails?: "a@x.com, b@y.com" }
export const sendCouponCampaign = async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).lean().catch(() => null);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: "Activate the coupon before sending it" });

    let recipients;
    if (req.body.audience === "emails") {
        const emails = String(req.body.emails || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
        const bad = emails.find((e) => !validator.isEmail(e));
        if (bad) return res.status(400).json({ success: false, message: `"${bad}" is not a valid email` });
        const users = await userModel.find({ email: { $in: emails } }, { name: 1, email: 1 }).lean();
        const names = Object.fromEntries(users.map((u) => [u.email.toLowerCase(), u.name]));
        recipients = emails.map((e) => ({ email: e, name: names[e] || "there" }));
    } else {
        const users = await userModel.find(
            coupon.allowedCustomers?.length ? { email: { $in: coupon.allowedCustomers } } : {},
            { name: 1, email: 1 }
        ).limit(2000).lean();
        recipients = users.map((u) => ({ email: u.email, name: u.name }));
    }
    if (!recipients.length) return res.status(400).json({ success: false, message: "No recipients" });

    const vars = {
        coupon_code: coupon.code,
        coupon_offer: offerText(coupon),
        coupon_expiry: coupon.expiresAt ? `Valid until ${new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` : "",
    };
    audit(req, { action: "coupon.campaign", entity: "coupon", entityId: coupon._id, newData: { recipients: recipients.length } });

    // Sent in the background, one at a time, to stay within SMTP rate limits.
    setImmediate(async () => {
        for (const r of recipients) {
            await sendTemplate("coupon_campaign", r.email, { ...vars, customer_name: r.name }, { entity: "coupon", entityId: String(coupon._id) });
        }
    });
    res.json({ success: true, message: `Sending to ${recipients.length} customer${recipients.length === 1 ? "" : "s"}. Check the email log for delivery status.` });
};

// GET /api/user/coupons — list active coupons for storefront display
export const listPublicCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            $or: [{ expiresAt: { $gte: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }]
        }).select("code description type value maxDiscount minOrderAmount firstOrderOnly expiresAt").lean();
        res.json({ success: true, data: coupons });
    } catch (err) {
        res.json({ success: false, message: "Error loading coupons", data: [] });
    }
};
