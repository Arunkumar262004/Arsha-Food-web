import mongoose from "mongoose";
import UserModel from "../models/User-model.js";
import OrderModel from "../models/Order-model.js";

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Per-customer order stats keyed by userId (orders store the user id as a string).
const orderStats = (match = {}) => OrderModel.aggregate([
    { $match: match },
    {
        $group: {
            _id: "$userId",
            orders: { $sum: 1 },
            paidOrders: { $sum: { $cond: ["$payment", 1, 0] } },
            spent: { $sum: { $cond: ["$payment", "$amount", 0] } },
            lastOrder: { $max: "$date" },
            firstOrder: { $min: "$date" },
        },
    },
]);

// GET /api/admin/customers?q=&segment=all|buyers|new|inactive|never&sort=recent|spent|orders|name&page=1
export const listCustomers = async (req, res) => {
    const q = String(req.query.q || "").trim();
    const segment = String(req.query.segment || "all");
    const sort = String(req.query.sort || "recent");
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 25;

    const filter = q ? {
        $or: [
            { name: new RegExp(escapeRx(q), "i") },
            { email: new RegExp(escapeRx(q), "i") },
            { phone: new RegExp(escapeRx(q), "i") },
            { "address.city": new RegExp(escapeRx(q), "i") },
        ],
    } : {};

    const [users, stats] = await Promise.all([
        UserModel.find(filter, { password: 0, cartData: 0 }).lean(),
        orderStats(),
    ]);
    const statsBy = Object.fromEntries(stats.map((s) => [String(s._id), s]));
    const now = Date.now();
    const DAY = 86400000;

    let rows = users.map((u) => {
        const s = statsBy[String(u._id)] || {};
        return {
            _id: u._id, name: u.name, email: u.email, phone: u.phone || u.address?.phone || "",
            city: u.address?.city || "", avatar: u.avatar || "",
            joined: u.createdAt || new mongoose.Types.ObjectId(u._id).getTimestamp(),
            orders: s.orders || 0, paidOrders: s.paidOrders || 0, spent: s.spent || 0, lastOrder: s.lastOrder || null,
        };
    });

    const counts = {
        all: rows.length,
        buyers: rows.filter((r) => r.paidOrders > 0).length,
        repeat: rows.filter((r) => r.paidOrders > 1).length,
        never: rows.filter((r) => r.paidOrders === 0).length,
        inactive: rows.filter((r) => r.lastOrder && now - new Date(r.lastOrder) > 30 * DAY).length,
        new: rows.filter((r) => now - new Date(r.joined) <= 30 * DAY).length,
    };

    if (segment === "buyers") rows = rows.filter((r) => r.paidOrders > 0);
    else if (segment === "repeat") rows = rows.filter((r) => r.paidOrders > 1);
    else if (segment === "never") rows = rows.filter((r) => r.paidOrders === 0);
    else if (segment === "inactive") rows = rows.filter((r) => r.lastOrder && now - new Date(r.lastOrder) > 30 * DAY);
    else if (segment === "new") rows = rows.filter((r) => now - new Date(r.joined) <= 30 * DAY);

    const by = {
        spent: (a, b) => b.spent - a.spent,
        orders: (a, b) => b.orders - a.orders,
        name: (a, b) => a.name.localeCompare(b.name),
        recent: (a, b) => new Date(b.lastOrder || b.joined) - new Date(a.lastOrder || a.joined),
    };
    rows.sort(by[sort] || by.recent);

    const totals = {
        customers: users.length,
        revenue: stats.reduce((s, r) => s + (r.spent || 0), 0),
        buyers: counts.buyers,
        repeatRate: counts.buyers ? Math.round((counts.repeat / counts.buyers) * 100) : 0,
    };
    res.json({
        success: true, totals, counts, page, pages: Math.max(1, Math.ceil(rows.length / limit)), total: rows.length,
        data: rows.slice((page - 1) * limit, page * limit),
    });
};

// GET /api/admin/customers/:id — profile, saved address and order history
export const getCustomer = async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).json({ success: false, message: "Customer not found" });
    const user = await UserModel.findById(req.params.id, { password: 0 }).lean();
    if (!user) return res.status(404).json({ success: false, message: "Customer not found" });

    const orders = await OrderModel.find({ userId: String(user._id) },
        { orderNumber: 1, items: 1, amount: 1, status: 1, date: 1, payment: 1, paymentStatus: 1, couponCode: 1, discount: 1 })
        .sort({ date: -1 }).limit(100).lean();
    const paid = orders.filter((o) => o.payment);
    const favourites = {};
    for (const o of paid) for (const i of o.items || []) {
        const k = i.name;
        favourites[k] = favourites[k] || { name: i.name, image: i.image, quantity: 0 };
        favourites[k].quantity += i.quantity || 1;
    }
    const cartCount = Object.values(user.cartData || {}).reduce((s, n) => s + (Number(n) || 0), 0);
    delete user.cartData;

    res.json({
        success: true,
        data: {
            ...user,
            joined: user.createdAt || new mongoose.Types.ObjectId(user._id).getTimestamp(),
            stats: {
                orders: orders.length, paidOrders: paid.length,
                spent: paid.reduce((s, o) => s + o.amount, 0),
                avgOrder: paid.length ? paid.reduce((s, o) => s + o.amount, 0) / paid.length : 0,
                lastOrder: orders[0]?.date || null,
                couponsUsed: paid.filter((o) => o.couponCode).length,
                cartItems: cartCount,
            },
            favourites: Object.values(favourites).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
            orders,
        },
    });
};
