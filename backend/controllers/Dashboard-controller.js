import OrderModel from "../models/Order-model.js";
import UserModel from "../models/User-model.js";
import FoodModel from "../models/Foodmodel.js";
import mongoose from "mongoose";
import { isRazorpayConfigured, razorpayMode } from "../services/razorpay.js";
import { activeProvider } from "../services/storage.js";

const TZ = process.env.STORE_TIMEZONE || "Asia/Kolkata";
const DAY = 86400000;

// Offset (minutes) of the store timezone from UTC at a given instant.
const tzOffset = (d) => {
    const asTz = new Date(d.toLocaleString("en-US", { timeZone: TZ }));
    const asUtc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return (asTz - asUtc) / 60000;
};

// Midnight (store timezone) of the day containing `d`, shifted by `addDays`.
const startOfDay = (d, addDays = 0) => {
    const off = tzOffset(d);
    const local = new Date(d.getTime() + off * 60000);
    local.setUTCHours(0, 0, 0, 0);
    local.setUTCDate(local.getUTCDate() + addDays);
    return new Date(local.getTime() - off * 60000);
};

const startOfMonth = (d, addMonths = 0) => {
    const off = tzOffset(d);
    const local = new Date(d.getTime() + off * 60000);
    const m = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + addMonths, 1));
    return new Date(m.getTime() - off * 60000);
};

const startOfYear = (d) => {
    const off = tzOffset(d);
    const local = new Date(d.getTime() + off * 60000);
    return new Date(Date.UTC(local.getUTCFullYear(), 0, 1) - off * 60000);
};

const parseDay = (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return null;
    const d = new Date(`${s}T12:00:00Z`);
    return isNaN(d) ? null : startOfDay(d);
};

export const resolveRange = (range, from, to, now = new Date()) => {
    const today = startOfDay(now);
    const tomorrow = startOfDay(now, 1);
    switch (range) {
        case "today": return { start: today, end: tomorrow };
        case "yesterday": return { start: startOfDay(now, -1), end: today };
        case "30d": return { start: startOfDay(now, -29), end: tomorrow };
        case "month": return { start: startOfMonth(now), end: tomorrow };
        case "prevmonth": return { start: startOfMonth(now, -1), end: startOfMonth(now) };
        case "year": return { start: startOfYear(now), end: tomorrow };
        case "custom": {
            const s = parseDay(from), e = parseDay(to);
            if (s && e && s <= e) return { start: s, end: new Date(e.getTime() + DAY) };
            return { start: startOfDay(now, -6), end: tomorrow };
        }
        case "7d":
        default: return { start: startOfDay(now, -6), end: tomorrow };
    }
};

const PAID = { payment: true };
const inRange = (start, end) => ({ date: { $gte: start, $lt: end } });

const sumPaid = async (start, end) => {
    const match = { ...PAID };
    if (start) Object.assign(match, inRange(start, end));
    const [r] = await OrderModel.aggregate([
        { $match: match },
        { $group: { _id: null, revenue: { $sum: "$amount" }, orders: { $sum: 1 } } },
    ]);
    return { revenue: r?.revenue || 0, orders: r?.orders || 0 };
};

// Users created in a range. Older users have no createdAt, so fall back to the ObjectId timestamp.
const userCreatedAt = { $ifNull: ["$createdAt", { $toDate: "$_id" }] };
const countUsers = async (start, end) => {
    const [r] = await UserModel.aggregate([
        { $match: { $expr: { $and: [{ $gte: [userCreatedAt, start] }, { $lt: [userCreatedAt, end] }] } } },
        { $count: "n" },
    ]);
    return r?.n || 0;
};

const pct = (cur, prev) => (prev ? +(((cur - prev) / prev) * 100).toFixed(1) : null);

// Build gap-free buckets so charts show zero days instead of skipping them.
const buildBuckets = (start, end, unit) => {
    const fmt = unit === "hour" ? "%Y-%m-%d %H" : unit === "month" ? "%Y-%m" : "%Y-%m-%d";
    const keys = [];
    const step = (d) => unit === "hour" ? new Date(d.getTime() + 3600000)
        : unit === "month" ? startOfMonth(d, 1) : startOfDay(d, 1);
    for (let d = unit === "month" ? startOfMonth(start) : start; d < end; d = step(d)) {
        const local = new Date(d.getTime() + tzOffset(d) * 60000).toISOString();
        keys.push(unit === "hour" ? `${local.slice(0, 10)} ${local.slice(11, 13)}`
            : unit === "month" ? local.slice(0, 7) : local.slice(0, 10));
    }
    return { fmt, keys };
};

// GET /api/admin/dashboard?range=today|yesterday|7d|30d|month|prevmonth|year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
export const getDashboard = async (req, res) => {
    const range = String(req.query.range || "7d");
    const now = new Date();
    const { start, end } = resolveRange(range, req.query.from, req.query.to, now);
    const span = end - start;
    const prevStart = new Date(start.getTime() - span);
    const unit = span <= 2 * DAY ? "hour" : span <= 92 * DAY ? "day" : "month";
    const { fmt, keys } = buildBuckets(start, end, unit);

    const [
        allTime, today, week, month, cur, prev,
        totalCustomers, newCustomers, prevNewCustomers, totalProducts,
        statusRows, statusAllTime, seriesRows, signupRows, paymentRows,
        topProducts, topCategories, customerSplit, recentOrders, ordersInRange, prevOrdersInRange,
    ] = await Promise.all([
        sumPaid(),
        sumPaid(startOfDay(now), startOfDay(now, 1)),
        sumPaid(startOfDay(now, -6), startOfDay(now, 1)),
        sumPaid(startOfMonth(now), startOfDay(now, 1)),
        sumPaid(start, end),
        sumPaid(prevStart, start),
        UserModel.estimatedDocumentCount(),
        countUsers(start, end),
        countUsers(prevStart, start),
        FoodModel.estimatedDocumentCount(),

        OrderModel.aggregate([
            { $match: inRange(start, end) },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        OrderModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        OrderModel.aggregate([
            { $match: inRange(start, end) },
            {
                $group: {
                    _id: { $dateToString: { format: fmt, date: "$date", timezone: TZ } },
                    revenue: { $sum: { $cond: ["$payment", "$amount", 0] } },
                    orders: { $sum: 1 },
                    paidOrders: { $sum: { $cond: ["$payment", 1, 0] } },
                },
            },
        ]),
        UserModel.aggregate([
            { $project: { at: userCreatedAt } },
            { $match: { at: { $gte: start, $lt: end } } },
            { $group: { _id: { $dateToString: { format: fmt, date: "$at", timezone: TZ } }, n: { $sum: 1 } } },
        ]),
        OrderModel.aggregate([
            { $match: { ...PAID, ...inRange(start, end) } },
            // Orders created before Razorpay was added were paid with Stripe.
            { $group: { _id: { $ifNull: ["$paymentMethod", "stripe"] }, count: { $sum: 1 }, amount: { $sum: "$amount" } } },
            { $sort: { amount: -1 } },
        ]),
        OrderModel.aggregate([
            { $match: { ...PAID, ...inRange(start, end) } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $ifNull: [{ $toString: "$items._id" }, "$items.name"] },
                    name: { $first: "$items.name" },
                    image: { $first: "$items.image" },
                    category: { $first: "$items.category" },
                    quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
                    revenue: { $sum: { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 1] }] } },
                },
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
        ]),
        OrderModel.aggregate([
            { $match: { ...PAID, ...inRange(start, end) } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $ifNull: ["$items.category", "Uncategorised"] },
                    quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
                    revenue: { $sum: { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 1] }] } },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 6 },
        ]),
        // New vs returning: a customer is "new" if their first paid order falls inside the range.
        OrderModel.aggregate([
            { $match: { ...PAID, date: { $lt: end } } },
            { $group: { _id: "$userId", first: { $min: "$date" }, last: { $max: "$date" } } },
            { $match: { last: { $gte: start } } },
            { $group: { _id: { $cond: [{ $gte: ["$first", start] }, "new", "returning"] }, n: { $sum: 1 } } },
        ]),
        OrderModel.find({}, { orderNumber: 1, items: 1, amount: 1, status: 1, date: 1, payment: 1, paymentStatus: 1, paymentMethod: 1, "address.firstName": 1, "address.lastName": 1 })
            .sort({ date: -1 }).limit(6).lean(),
        OrderModel.countDocuments(inRange(start, end)),
        OrderModel.countDocuments(inRange(prevStart, start)),
    ]);

    const statusMap = (rows) => Object.fromEntries(rows.map(r => [r._id || "Unknown", r.count]));
    const s = statusMap(statusAllTime);
    const seriesBy = Object.fromEntries(seriesRows.map(r => [r._id, r]));
    const signupsBy = Object.fromEntries(signupRows.map(r => [r._id, r.n]));
    const split = Object.fromEntries(customerSplit.map(r => [r._id, r.n]));
    const aov = cur.orders ? cur.revenue / cur.orders : 0;
    const prevAov = prev.orders ? prev.revenue / prev.orders : 0;

    res.json({
        success: true,
        range: { key: range, start, end, unit, timezone: TZ },
        kpis: {
            totalSales: allTime.revenue,
            todaySales: today.revenue,
            weekSales: week.revenue,
            monthSales: month.revenue,
            totalOrders: Object.values(s).reduce((a, b) => a + b, 0),
            pendingOrders: s["Payment Pending"] || 0,
            processingOrders: s["Food Processing"] || 0,
            outForDelivery: s["Out for Delivery"] || 0,
            completedOrders: s["Delivered"] || 0,
            cancelledOrders: (s["Cancelled"] || 0) + (s["Payment Failed"] || 0),
            totalCustomers,
            totalProducts,
            // Available once the inventory / returns modules exist (Phase 2 / 5).
            lowStockProducts: null,
            outOfStockProducts: null,
            returnedOrders: null,
            refundAmount: null,
        },
        period: {
            revenue: cur.revenue, revenueChange: pct(cur.revenue, prev.revenue),
            paidOrders: cur.orders, paidOrdersChange: pct(cur.orders, prev.orders),
            orders: ordersInRange, ordersChange: pct(ordersInRange, prevOrdersInRange),
            newCustomers, newCustomersChange: pct(newCustomers, prevNewCustomers),
            aov, aovChange: pct(aov, prevAov),
            newBuyers: split.new || 0,
            returningBuyers: split.returning || 0,
        },
        series: keys.map(k => ({
            bucket: k,
            revenue: seriesBy[k]?.revenue || 0,
            orders: seriesBy[k]?.orders || 0,
            newCustomers: signupsBy[k] || 0,
        })),
        ordersByStatus: Object.entries(statusMap(statusRows)).map(([status, count]) => ({ status, count })),
        paymentMethods: paymentRows.map(r => ({ method: r._id, count: r.count, amount: r.amount })),
        topProducts: topProducts.map(p => ({ id: p._id, name: p.name, image: p.image, category: p.category, quantity: p.quantity, revenue: p.revenue })),
        topCategories: topCategories.map(c => ({ category: c._id, quantity: c.quantity, revenue: c.revenue })),
        recentOrders: recentOrders.map(o => ({
            id: o._id,
            orderNumber: o.orderNumber || `#${String(o._id).slice(-6).toUpperCase()}`,
            customer: [o.address?.firstName, o.address?.lastName].filter(Boolean).join(" ") || "—",
            items: (o.items || []).length,
            amount: o.amount,
            status: o.status,
            paid: !!o.payment,
            paymentMethod: o.paymentMethod || "stripe",
            date: o.date,
        })),
    });
};

// GET /api/admin/system-status — integration health for the header pills (no secrets).
export const getSystemStatus = (req, res) => {
    res.json({
        success: true,
        data: {
            database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
            razorpay: { configured: isRazorpayConfigured(), mode: razorpayMode(), webhook: !!process.env.RAZORPAY_WEBHOOK_SECRET },
            storage: { provider: activeProvider() },
        },
    });
};
