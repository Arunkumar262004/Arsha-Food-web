import OrderModel from "../models/Order-model.js";
import UserModel from "../models/User-model.js";
import { resolveRange, buildBuckets, TZ } from "./Dashboard-controller.js";

const DAY = 86400000;
const money = (n) => Math.round((n || 0) * 100) / 100;
const lineTotal = { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 1] }] };
const qty = { $ifNull: ["$items.quantity", 1] };

// GET /api/admin/reports?range=7d|30d|month|prevmonth|year|custom&from=&to=
// Sales are paid orders only (same rule as the dashboard).
export const getReport = async (req, res) => {
    const range = String(req.query.range || "30d");
    const { start, end } = resolveRange(range, req.query.from, req.query.to);
    const span = end - start;
    const unit = span <= 2 * DAY ? "hour" : span <= 92 * DAY ? "day" : "month";
    const { fmt, keys } = buildBuckets(start, end, unit);
    const paid = { payment: true, date: { $gte: start, $lt: end } };
    const all = { date: { $gte: start, $lt: end } };

    const [series, products, categories, hours, weekdays, coupons, statuses, customers, totalsRow, allOrders] = await Promise.all([
        OrderModel.aggregate([
            { $match: paid },
            {
                $group: {
                    _id: { $dateToString: { format: fmt, date: "$date", timezone: TZ } },
                    revenue: { $sum: "$amount" }, orders: { $sum: 1 },
                    discount: { $sum: { $ifNull: ["$discount", 0] } }, delivery: { $sum: { $ifNull: ["$deliveryFee", 0] } },
                },
            },
        ]),
        OrderModel.aggregate([
            { $match: paid }, { $unwind: "$items" },
            {
                $group: {
                    _id: { $ifNull: [{ $toString: "$items._id" }, "$items.name"] },
                    name: { $first: "$items.name" }, image: { $first: "$items.image" }, category: { $first: "$items.category" },
                    quantity: { $sum: qty }, revenue: { $sum: lineTotal }, orders: { $sum: 1 },
                },
            },
            { $sort: { revenue: -1 } },
        ]),
        OrderModel.aggregate([
            { $match: paid }, { $unwind: "$items" },
            { $group: { _id: { $ifNull: ["$items.category", "Uncategorised"] }, quantity: { $sum: qty }, revenue: { $sum: lineTotal } } },
            { $sort: { revenue: -1 } },
        ]),
        OrderModel.aggregate([
            { $match: paid },
            { $group: { _id: { $hour: { date: "$date", timezone: TZ } }, orders: { $sum: 1 }, revenue: { $sum: "$amount" } } },
        ]),
        OrderModel.aggregate([
            { $match: paid },
            { $group: { _id: { $dayOfWeek: { date: "$date", timezone: TZ } }, orders: { $sum: 1 }, revenue: { $sum: "$amount" } } },
        ]),
        OrderModel.aggregate([
            { $match: { ...paid, couponCode: { $nin: [null, ""] } } },
            { $group: { _id: "$couponCode", uses: { $sum: 1 }, discount: { $sum: { $ifNull: ["$discount", 0] } }, revenue: { $sum: "$amount" } } },
            { $sort: { uses: -1 } },
        ]),
        OrderModel.aggregate([{ $match: all }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        OrderModel.aggregate([
            { $match: paid },
            { $group: { _id: "$userId", orders: { $sum: 1 }, spent: { $sum: "$amount" }, name: { $first: { $concat: [{ $ifNull: ["$address.firstName", ""] }, " ", { $ifNull: ["$address.lastName", ""] }] } } } },
            { $sort: { spent: -1 } }, { $limit: 10 },
        ]),
        OrderModel.aggregate([
            { $match: paid },
            {
                $group: {
                    _id: null, revenue: { $sum: "$amount" }, orders: { $sum: 1 },
                    subtotal: { $sum: { $ifNull: ["$subtotal", "$amount"] } }, discount: { $sum: { $ifNull: ["$discount", 0] } },
                    delivery: { $sum: { $ifNull: ["$deliveryFee", 0] } }, customers: { $addToSet: "$userId" },
                },
            },
        ]),
        OrderModel.countDocuments(all),
    ]);

    // Names for top customers come from accounts when available (addresses can be edited per order).
    const ids = customers.map((c) => c._id).filter((id) => /^[a-f0-9]{24}$/i.test(id));
    const users = Object.fromEntries((await UserModel.find({ _id: { $in: ids } }, { name: 1, email: 1 }).lean()).map((u) => [String(u._id), u]));

    const t = totalsRow[0] || {};
    const items = products.reduce((s, p) => s + p.quantity, 0);
    const seriesBy = Object.fromEntries(series.map((r) => [r._id, r]));
    const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    res.json({
        success: true,
        range: { key: range, start, end, unit, timezone: TZ },
        totals: {
            revenue: money(t.revenue), orders: t.orders || 0, allOrders,
            avgOrder: t.orders ? money(t.revenue / t.orders) : 0,
            itemsSold: items, discount: money(t.discount), delivery: money(t.delivery), subtotal: money(t.subtotal),
            customers: t.customers?.length || 0,
            conversion: allOrders ? Math.round(((t.orders || 0) / allOrders) * 100) : 0,
        },
        series: keys.map((k) => ({ bucket: k, revenue: money(seriesBy[k]?.revenue), orders: seriesBy[k]?.orders || 0, discount: money(seriesBy[k]?.discount) })),
        products: products.map((p) => ({ ...p, revenue: money(p.revenue) })),
        categories: categories.map((c) => ({ name: c._id, quantity: c.quantity, revenue: money(c.revenue) })),
        hours: Array.from({ length: 24 }, (_, h) => { const r = hours.find((x) => x._id === h); return { hour: h, orders: r?.orders || 0, revenue: money(r?.revenue) }; }),
        weekdays: WEEK.map((d, i) => { const r = weekdays.find((x) => x._id === i + 1); return { day: d, orders: r?.orders || 0, revenue: money(r?.revenue) }; }),
        coupons: coupons.map((c) => ({ code: c._id, uses: c.uses, discount: money(c.discount), revenue: money(c.revenue) })),
        statuses: statuses.map((s) => ({ status: s._id || "Unknown", count: s.count })),
        topCustomers: customers.map((c) => ({
            id: c._id, orders: c.orders, spent: money(c.spent),
            name: users[c._id]?.name || c.name?.trim() || "Guest", email: users[c._id]?.email || "",
        })),
    });
};

// GET /api/admin/payments?status=all|paid|pending|failed|refunded&range=&from=&to=&q=&page=
export const listPayments = async (req, res) => {
    const { start, end } = resolveRange(String(req.query.range || "30d"), req.query.from, req.query.to);
    const status = String(req.query.status || "all");
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;

    const base = { date: { $gte: start, $lt: end } };
    const match = { ...base };
    if (["paid", "pending", "failed", "refunded"].includes(status)) {
        // Older orders only have the boolean `payment` flag.
        if (status === "paid") match.$or = [{ paymentStatus: "paid" }, { payment: true }];
        else if (status === "pending") Object.assign(match, { payment: { $ne: true }, paymentStatus: { $in: ["pending", null] } });
        else match.paymentStatus = status;
    }
    if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        match.$and = [{ $or: [{ orderNumber: rx }, { razorpayPaymentId: rx }, { razorpayOrderId: rx }, { "address.firstName": rx }, { "address.lastName": rx }, { "address.phone": rx }] }];
    }

    const [rows, total, summary, methods] = await Promise.all([
        OrderModel.find(match, {
            orderNumber: 1, amount: 1, currency: 1, date: 1, paidAt: 1, payment: 1, paymentStatus: 1, paymentMethod: 1,
            razorpayOrderId: 1, razorpayPaymentId: 1, status: 1, couponCode: 1, discount: 1,
            "address.firstName": 1, "address.lastName": 1, "address.phone": 1, "address.email": 1,
        }).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        OrderModel.countDocuments(match),
        OrderModel.aggregate([
            { $match: base },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$payment", true] }, "paid", { $ifNull: ["$paymentStatus", "pending"] }] },
                    count: { $sum: 1 }, amount: { $sum: "$amount" },
                },
            },
        ]),
        OrderModel.aggregate([
            { $match: { ...base, payment: true } },
            { $group: { _id: { $ifNull: ["$paymentMethod", "stripe"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
        ]),
    ]);

    const s = Object.fromEntries(summary.map((r) => [r._id, { count: r.count, amount: money(r.amount) }]));
    const zero = { count: 0, amount: 0 };
    const paidCount = s.paid?.count || 0;
    const attempted = paidCount + (s.failed?.count || 0);
    res.json({
        success: true, page, pages: Math.max(1, Math.ceil(total / limit)), total,
        summary: {
            paid: s.paid || zero, pending: s.pending || zero, failed: s.failed || zero, refunded: s.refunded || zero,
            successRate: attempted ? Math.round((paidCount / attempted) * 100) : null,
        },
        methods: methods.map((m) => ({ method: m._id, count: m.count, amount: money(m.amount) })),
        data: rows.map((o) => ({
            ...o,
            state: o.payment ? "paid" : (o.paymentStatus || "pending"),
            customer: `${o.address?.firstName || ""} ${o.address?.lastName || ""}`.trim() || "Guest",
        })),
    });
};
