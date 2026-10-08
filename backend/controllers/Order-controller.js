import mongoose from "mongoose";
import OrderModel, { ORDER_STATUSES, nextOrderNumber } from "../models/Order-model.js";
import userModel from "../models/User-model.js";
import FoodModel from "../models/Foodmodel.js";
import WebhookEvent from "../models/WebhookEventmodel.js";
import { getSettings } from "../models/Settingmodel.js";
import { getRazorpay, isRazorpayConfigured, verifyPaymentSignature, verifyWebhookSignature } from "../services/razorpay.js";
import { audit } from "../services/audit.js";
import { applyCoupon, recordCouponUsage } from "../services/coupons.js";
import { notifyOrder, notifyStatusChange } from "../services/notify.js";

const ADDRESS_FIELDS = ["firstName", "lastName", "email", "street", "city", "state", "zipcode", "country", "phone"];

const cleanAddress = (a = {}) => {
    const out = {};
    for (const f of ADDRESS_FIELDS) out[f] = String(a[f] ?? "").trim().slice(0, 200);
    return out;
};

/**
 * Prices the requested lines from the database (shared by checkout and the coupon preview).
 * Prices always come from the database; the client only says *which* items and how many.
 *   lines: [{ id, quantity }]
 */
export const priceLines = async (lines) => {
    const qtyById = new Map();
    for (const l of lines || []) {
        const id = String(l.id || "");
        const qty = Math.floor(Number(l.quantity));
        if (!mongoose.isValidObjectId(id) || !(qty > 0)) continue;
        qtyById.set(id, Math.min(99, (qtyById.get(id) || 0) + qty));
    }
    if (qtyById.size === 0) throw Object.assign(new Error("No items in order"), { status: 400 });

    const foods = await FoodModel.find({ _id: { $in: [...qtyById.keys()] } }).lean();
    if (foods.length !== qtyById.size) throw Object.assign(new Error("Some items are no longer available"), { status: 400 });

    const items = foods.map(f => ({
        _id: f._id, name: f.name, price: f.price, quantity: qtyById.get(String(f._id)),
        image: f.image, category: f.category,
    }));
    const settings = await getSettings(["deliveryFee", "freeDeliveryThreshold", "currency"]);
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    let deliveryFee = Number(settings.deliveryFee) || 0;
    if (settings.freeDeliveryThreshold && subtotal >= Number(settings.freeDeliveryThreshold)) {
        deliveryFee = 0;
    }
    return { items, subtotal, deliveryFee, currency: settings.currency };
};

/** Applies an optional coupon to priced lines. Throws a 400 with the rule's message if it doesn't apply. */
export const quote = async ({ userId, lines, couponCode, customerEmail }) => {
    const priced = await priceLines(lines);
    let discount = 0, deliveryFee = priced.deliveryFee, code;
    if (couponCode) {
        const user = await userModel.findById(userId, { email: 1 }).lean();
        const r = await applyCoupon({
            code: couponCode, userId, customerEmail: user?.email || customerEmail,
            items: priced.items, subtotal: priced.subtotal, deliveryFee,
        });
        if (!r.ok) throw Object.assign(new Error(r.message), { status: 400 });
        discount = r.discount;
        if (r.freeShipping) deliveryFee = 0;
        code = r.coupon.code;
    }
    const amount = Math.round((priced.subtotal - discount + deliveryFee) * 100) / 100;
    return { ...priced, discount, deliveryFee, couponCode: code, amount };
};

export const createCheckout = async ({ userId, lines, address, source, couponCode }) => {
    if (!isRazorpayConfigured()) throw Object.assign(new Error("Online payment is not configured"), { status: 503 });

    const { items, subtotal, deliveryFee, discount, amount, currency, couponCode: code } =
        await quote({ userId, lines, couponCode, customerEmail: address?.email });
    if (amount < 1) throw Object.assign(new Error("Order total must be at least ₹1"), { status: 400 });

    const order = await OrderModel.create({
        orderNumber: await nextOrderNumber(),
        userId, items, subtotal, deliveryFee, discount, couponCode: code, amount,
        currency,
        address: cleanAddress(address),
        status: "Payment Pending",
        paymentStatus: "pending",
        paymentMethod: "razorpay",
        source,
        timeline: [{ event: "order_created", to: "Payment Pending", by: "customer" }],
    });

    const rzpOrder = await getRazorpay().orders.create({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: order.orderNumber,
        notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    });

    order.razorpayOrderId = rzpOrder.id;
    order.timeline.push({ event: "payment_initiated", by: "system", note: rzpOrder.id });
    await order.save();

    const user = await userModel.findById(userId, { name: 1, email: 1 }).lean();

    return {
        orderId: order._id,
        orderNumber: order.orderNumber,
        razorpay: {
            key: process.env.RAZORPAY_KEY_ID, // public key id only, never the secret
            orderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
        },
        prefill: {
            name: user?.name || `${order.address.firstName} ${order.address.lastName}`.trim(),
            email: order.address.email || user?.email,
            contact: order.address.phone,
        },
    };
};

// Idempotent: only the first call flips an unpaid order to paid.
const markPaid = async ({ filter, paymentId, by }) => {
    const order = await OrderModel.findOneAndUpdate(
        { ...filter, payment: false },
        {
            $set: {
                payment: true, paymentStatus: "paid", status: "Food Processing",
                razorpayPaymentId: paymentId, paidAt: new Date(),
            },
            $push: { timeline: { event: "payment_success", from: "Payment Pending", to: "Food Processing", note: paymentId, by } },
        },
        { new: true }
    );
    if (order) {
        if (order.source === "cart") await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
        await recordCouponUsage(order);
        notifyOrder(order, "order_confirmed");
    }
    return order;
};

const markFailed = async ({ filter, reason, by }) => {
    const order = await OrderModel.findOneAndUpdate(
        { ...filter, payment: false, status: "Payment Pending" },
        {
            $set: { paymentStatus: "failed", status: "Payment Failed" },
            $push: { timeline: { event: "payment_failed", from: "Payment Pending", to: "Payment Failed", note: reason, by } },
        },
        { new: true }
    );
    if (order) notifyOrder(order, "payment_failed");
    return order;
};

const sendError = (res, error, fallback) => {
    console.error(fallback, error.message);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : fallback });
};

// POST /api/order/place  — checkout the user's cart
const PlaceOrder = async (req, res) => {
    try {
        const lines = (req.body.items || []).map(i => ({ id: i._id || i.id || i.itemId, quantity: i.quantity }));
        const data = await createCheckout({ userId: req.body.userId, lines, address: req.body.address, source: "cart", couponCode: req.body.couponCode });
        res.json({ success: true, ...data });
    } catch (error) {
        sendError(res, error, "Could not start payment");
    }
}

// POST /api/order/coupon — preview a coupon against the cart (same rules as checkout)
const previewCoupon = async (req, res) => {
    try {
        const lines = (req.body.items || []).map(i => ({ id: i._id || i.id || i.itemId, quantity: i.quantity }));
        const q = await quote({ userId: req.body.userId, lines, couponCode: req.body.code });
        res.json({ success: true, code: q.couponCode, subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee, total: q.amount });
    } catch (error) {
        if (error.status) return res.json({ success: false, message: error.message });
        sendError(res, error, "Could not check coupon");
    }
}

// POST /api/order/verify — called by the storefront after Razorpay Checkout succeeds
const verifyOrder = async (req, res) => {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    try {
        const order = await OrderModel.findOne({ _id: orderId, userId: req.body.userId }).catch(() => null);
        if (!order || order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: "Order not found" });
        }
        const valid = verifyPaymentSignature({ orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature });
        if (!valid) {
            order.timeline.push({ event: "payment_verification_failed", note: razorpay_payment_id, by: "customer" });
            await order.save();
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
        await markPaid({ filter: { _id: order._id }, paymentId: razorpay_payment_id, by: "customer" });
        res.json({ success: true, message: "Paid", orderNumber: order.orderNumber })
    } catch (error) {
        sendError(res, error, "Error verifying payment");
    }
}

// POST /api/order/payment-failed — customer closed the checkout or the payment failed
const paymentFailed = async (req, res) => {
    try {
        await markFailed({
            filter: { _id: req.body.orderId, userId: req.body.userId },
            reason: String(req.body.reason || "Checkout closed").slice(0, 300),
            by: "customer",
        });
        res.json({ success: true });
    } catch (error) {
        sendError(res, error, "Error updating order");
    }
}

// POST /api/order/razorpay/webhook — raw body; signature + idempotency checked
const razorpayWebhook = async (req, res) => {
    const raw = req.body; // Buffer (express.raw)
    if (!verifyWebhookSignature(raw, req.headers["x-razorpay-signature"])) {
        return res.status(400).json({ success: false });
    }
    let body;
    try { body = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ success: false }); }

    const eventId = req.headers["x-razorpay-event-id"] || `${body.event}:${body.payload?.payment?.entity?.id || body.created_at}`;
    let record;
    try {
        record = await WebhookEvent.create({ provider: "razorpay", eventId, event: body.event, payload: body });
    } catch (err) {
        if (err.code === 11000) return res.json({ success: true, duplicate: true }); // already handled
        throw err;
    }

    try {
        const payment = body.payload?.payment?.entity;
        const rzpOrderId = payment?.order_id || body.payload?.order?.entity?.id;
        let result = "ignored";

        if (["payment.captured", "order.paid"].includes(body.event) && rzpOrderId) {
            const order = await OrderModel.findOne({ razorpayOrderId: rzpOrderId });
            if (!order) result = "order not found";
            else if (payment && payment.amount !== Math.round(order.amount * 100)) result = "amount mismatch";
            else result = (await markPaid({ filter: { _id: order._id }, paymentId: payment?.id, by: "webhook" })) ? "marked paid" : "already paid";
        } else if (body.event === "payment.failed" && rzpOrderId) {
            await OrderModel.updateOne(
                { razorpayOrderId: rzpOrderId },
                { $push: { timeline: { event: "payment_failed", note: payment?.error_description, by: "webhook" } } }
            );
            result = "failure recorded";
        }

        record.status = result === "ignored" ? "ignored" : "processed";
        record.result = result;
        await record.save();
        res.json({ success: true });
    } catch (error) {
        record.status = "failed";
        record.error = error.message;
        await record.save();
        console.error("Webhook error:", error.message);
        res.status(500).json({ success: false });
    }
}


// user order for fontend
const usersOrder = async (req, res) => {

    try {
        const orders = await OrderModel.find({ userId: req.body.userId }).sort({ date: -1 });
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error in order" })

    }
}


// list of user orders in admin pannel

const listOrders = async (req, res) => {
    try {
        const Orders = await OrderModel.find({}).sort({ date: -1 });
        res.json({ success: true, data: Orders, statuses: ORDER_STATUSES })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error List order" })

    }
}


// API For Updating order Status

const UpdateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        if (!ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const order = await OrderModel.findById(orderId).catch(() => null);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const from = order.status;
        if (from !== status) {
            order.status = status;
            order.timeline.push({ event: "status_changed", from, to: status, by: req.admin.email });
            await order.save();
            notifyStatusChange(order);
            audit(req, { action: "order.status", entity: "order", entityId: order._id, oldData: { status: from }, newData: { status } });
        }
        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error inSaving the Status" })

    }
}

export { PlaceOrder, previewCoupon, verifyOrder, paymentFailed, razorpayWebhook, usersOrder, listOrders, UpdateStatus }
