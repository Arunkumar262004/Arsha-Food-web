import Coupon from "../models/Couponmodel.js";
import CouponUsage from "../models/CouponUsagemodel.js";
import OrderModel from "../models/Order-model.js";

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Pure coupon rule check — no database access, so it is unit-testable.
 *   coupon: Coupon document/plain object
 *   ctx: { items: [{ _id, price, quantity, category }], subtotal, deliveryFee, now,
 *          customerEmail, usedByCustomer, isFirstOrder }
 * Returns { ok: true, discount, freeShipping, eligibleSubtotal } or { ok: false, message }.
 */
export const evaluateCoupon = (coupon, ctx) => {
    const now = ctx.now || new Date();
    const fail = (message) => ({ ok: false, message });

    if (!coupon || !coupon.isActive) return fail("This coupon code is not valid");
    if (coupon.startsAt && now < new Date(coupon.startsAt)) return fail("This coupon is not active yet");
    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) return fail("This coupon has expired");
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return fail("This coupon has reached its usage limit");
    if (coupon.perCustomerLimit && ctx.usedByCustomer >= coupon.perCustomerLimit) {
        return fail("You have already used this coupon");
    }
    if (coupon.allowedCustomers?.length) {
        const email = String(ctx.customerEmail || "").toLowerCase();
        if (!coupon.allowedCustomers.map((e) => e.toLowerCase()).includes(email)) return fail("This coupon is not available for your account");
    }
    if (coupon.firstOrderOnly && !ctx.isFirstOrder) return fail("This coupon is only valid on your first order");
    if (coupon.minOrderAmount && ctx.subtotal < coupon.minOrderAmount) {
        return fail(`Add items worth ₹${round2(coupon.minOrderAmount - ctx.subtotal)} more to use this coupon (minimum ₹${coupon.minOrderAmount})`);
    }

    // Only items matching the product/category restrictions count towards the discount.
    const restricted = coupon.applicableProducts?.length || coupon.applicableCategories?.length;
    const eligible = restricted
        ? ctx.items.filter((i) =>
            coupon.applicableProducts?.includes(String(i._id)) || coupon.applicableCategories?.includes(i.category))
        : ctx.items;
    const eligibleSubtotal = round2(eligible.reduce((s, i) => s + i.price * i.quantity, 0));
    if (eligibleSubtotal <= 0) return fail("This coupon doesn't apply to the items in your cart");

    if (coupon.type === "free_shipping") {
        return { ok: true, discount: 0, freeShipping: true, eligibleSubtotal };
    }

    let discount = coupon.type === "percentage"
        ? eligibleSubtotal * (Math.min(100, Math.max(0, coupon.value)) / 100)
        : Math.max(0, coupon.value);
    if (coupon.type === "percentage" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = round2(Math.min(discount, eligibleSubtotal));

    return { ok: true, discount, freeShipping: false, eligibleSubtotal };
};

/** Loads the coupon and the customer's history, then runs evaluateCoupon. */
export const applyCoupon = async ({ code, userId, customerEmail, items, subtotal, deliveryFee }) => {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) return { ok: false, message: "Enter a coupon code" };
    const coupon = await Coupon.findOne({ code: clean }).lean();
    if (!coupon) return { ok: false, message: "This coupon code is not valid" };

    const [usedByCustomer, paidOrders] = await Promise.all([
        CouponUsage.countDocuments({ coupon: coupon._id, userId: String(userId) }),
        OrderModel.countDocuments({ userId: String(userId), payment: true }),
    ]);
    const result = evaluateCoupon(coupon, {
        items, subtotal, deliveryFee, customerEmail, usedByCustomer, isFirstOrder: paidOrders === 0,
    });
    return { ...result, coupon };
};

/** Called once an order is paid. Idempotent: one usage row per order. */
export const recordCouponUsage = async (order) => {
    if (!order.couponCode) return;
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (!coupon) return;
    try {
        await CouponUsage.create({
            coupon: coupon._id, code: coupon.code, userId: order.userId,
            order: order._id, orderNumber: order.orderNumber, discount: order.discount || 0,
        });
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    } catch (err) {
        if (err.code !== 11000) console.error("Coupon usage error:", err.message); // 11000 = already recorded
    }
};
