import validator from "validator";
import Sale from "../models/Salemodel.js";
import SaleSignup from "../models/SaleSignupmodel.js";
import FoodModel from "../models/Foodmodel.js";
import { audit } from "../services/audit.js";
import { emailSaleSignups } from "../services/sales.js";

const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ""));
const statusOf = (s, now = Date.now()) =>
    !s.isActive ? "paused" : new Date(s.startsAt) > now ? "scheduled" : new Date(s.endsAt) <= now ? "ended" : "live";

const parseSale = async (b) => {
    const name = String(b.name || "").trim().slice(0, 60);
    if (!name) return { error: "Give the sale a name, e.g. Diwali Sale" };
    const startsAt = new Date(b.startsAt), endsAt = new Date(b.endsAt);
    if (isNaN(startsAt) || isNaN(endsAt)) return { error: "Choose when the sale starts and ends" };
    if (endsAt <= startsAt) return { error: "The sale must end after it starts" };
    if (!/^#[0-9a-f]{6}$/i.test(b.themeColor || "#b8322a")) return { error: "Choose a colour" };

    const raw = Array.isArray(b.items) ? b.items : [];
    if (!raw.length) return { error: "Add at least one dish to the sale" };
    const ids = [...new Set(raw.map((i) => String(i.food)).filter(isId))];
    const foods = Object.fromEntries((await FoodModel.find({ _id: { $in: ids } }, { name: 1, price: 1 }).lean()).map((f) => [String(f._id), f]));
    const items = [];
    for (const id of ids) {
        const f = foods[id];
        if (!f) return { error: "One of the dishes no longer exists" };
        const price = Math.round(Number(raw.find((i) => String(i.food) === id).salePrice) * 100) / 100;
        if (!(price > 0)) return { error: `Enter a sale price for ${f.name}` };
        if (price >= f.price) return { error: `${f.name}: sale price must be lower than ₹${f.price}` };
        items.push({ food: id, salePrice: price });
    }
    return {
        data: {
            name, startsAt, endsAt, items,
            tagline: String(b.tagline || "").trim().slice(0, 100),
            description: String(b.description || "").trim().slice(0, 300),
            themeColor: (b.themeColor || "#b8322a").toLowerCase(),
            isActive: b.isActive !== false,
        },
    };
};

// ── Storefront ────────────────────────────────────────────────

// GET /api/sales — live and upcoming sales. Sale prices of upcoming sales are never sent (they stay locked).
export const listPublicSales = async (req, res) => {
    const now = new Date();
    const sales = await Sale.find({ isActive: true, endsAt: { $gt: now } }).sort({ startsAt: 1 }).limit(5)
        .populate("items.food", "name slug image category isVeg price isAvailable").lean();
    const data = sales.map((s) => {
        const live = new Date(s.startsAt) <= now;
        const items = s.items.filter((i) => i.food);
        const maxOff = Math.max(0, ...items.map((i) => Math.round((1 - i.salePrice / i.food.price) * 100)));
        return {
            _id: s._id, name: s.name, tagline: s.tagline, description: s.description, themeColor: s.themeColor,
            startsAt: s.startsAt, endsAt: s.endsAt, status: live ? "live" : "upcoming", maxOff,
            items: items.map((i) => ({
                food: { _id: i.food._id, slug: i.food.slug, name: i.food.name, image: i.food.image, category: i.food.category, isVeg: i.food.isVeg, price: i.food.price },
                ...(live ? { salePrice: i.salePrice } : {}),
            })),
        };
    });
    res.json({ success: true, data });
};

// POST /api/sales/:id/notify  { name, email, phone }
export const signupForSale = async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: "Sale not found" });
    const sale = await Sale.findOne({ _id: req.params.id, isActive: true, endsAt: { $gt: new Date() } }).lean();
    if (!sale) return res.status(404).json({ success: false, message: "This sale has ended" });

    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").replace(/[\s-]/g, "").replace(/^\+?91/, "");
    const name = String(req.body.name || "").trim().slice(0, 60);
    if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: "Enter a valid email address" });
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });

    await SaleSignup.updateOne({ sale: sale._id, email }, { $set: { name, phone }, $setOnInsert: { sale: sale._id, email } }, { upsert: true });
    res.json({ success: true, message: "You're on the list! We'll email you the moment the sale starts." });
};

// ── Admin ─────────────────────────────────────────────────────

// GET /api/admin/sales
export const listSales = async (req, res) => {
    const sales = await Sale.find().sort({ startsAt: -1 }).populate("items.food", "name image price category").lean();
    const counts = await SaleSignup.aggregate([
        { $group: { _id: "$sale", signups: { $sum: 1 }, notified: { $sum: { $cond: [{ $ifNull: ["$notifiedAt", false] }, 1, 0] } } } },
    ]);
    const by = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    res.json({
        success: true,
        data: sales.map((s) => ({ ...s, status: statusOf(s), signups: by[String(s._id)]?.signups || 0, notified: by[String(s._id)]?.notified || 0 })),
    });
};

export const createSale = async (req, res) => {
    const { data, error } = await parseSale(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const sale = await Sale.create(data);
    audit(req, { action: "sale.create", entity: "sale", entityId: sale._id, newData: { name: sale.name, startsAt: sale.startsAt, endsAt: sale.endsAt, items: sale.items.length } });
    res.json({ success: true, message: "Sale created", data: sale });
};

export const updateSale = async (req, res) => {
    const sale = isId(req.params.id) ? await Sale.findById(req.params.id) : null;
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    // Quick pause/resume from the list
    if (Object.keys(req.body).length === 1 && req.body.isActive !== undefined) {
        sale.isActive = !!req.body.isActive;
    } else {
        const { data, error } = await parseSale(req.body);
        if (error) return res.status(400).json({ success: false, message: error });
        // Moving the start into the future again means the "sale is live" email should go out again later.
        if (data.startsAt > new Date() && sale.startEmailSentAt) sale.startEmailSentAt = undefined;
        Object.assign(sale, data);
    }
    await sale.save();
    audit(req, { action: "sale.update", entity: "sale", entityId: sale._id, newData: { name: sale.name, isActive: sale.isActive } });
    res.json({ success: true, message: sale.isActive ? "Sale saved" : "Sale paused", data: sale });
};

export const deleteSale = async (req, res) => {
    const sale = isId(req.params.id) ? await Sale.findByIdAndDelete(req.params.id) : null;
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    await SaleSignup.deleteMany({ sale: sale._id });
    audit(req, { action: "sale.delete", entity: "sale", entityId: sale._id, oldData: { name: sale.name } });
    res.json({ success: true, message: "Sale deleted" });
};

// GET /api/admin/sales/:id/signups
export const listSaleSignups = async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: "Sale not found" });
    const rows = await SaleSignup.find({ sale: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: rows });
};

// POST /api/admin/sales/:id/send — email sign-ups now (only while the sale is live; the watcher does this automatically)
export const sendSaleEmails = async (req, res) => {
    const sale = isId(req.params.id) ? await Sale.findById(req.params.id).lean() : null;
    if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
    if (statusOf(sale) !== "live") return res.status(400).json({ success: false, message: "Emails can only go out while the sale is live — they're sent automatically when it starts." });
    const pending = await SaleSignup.countDocuments({ sale: sale._id, notifiedAt: null });
    await Sale.updateOne({ _id: sale._id }, { $set: { startEmailSentAt: sale.startEmailSentAt || new Date() } });
    audit(req, { action: "sale.email", entity: "sale", entityId: sale._id, newData: { pending } });
    // Send in the background so a long list doesn't hold up the request.
    if (pending) setImmediate(() => emailSaleSignups(sale._id).catch((e) => console.error("Sale emails:", e.message)));
    res.json({ success: true, message: pending ? `Emailing ${pending} customer${pending === 1 ? "" : "s"} now — see Emails → Sent log for delivery` : "Everyone on the list has already been emailed" });
};
