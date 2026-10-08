import crypto from "crypto";
import Razorpay from "razorpay";

let client = null;

export const isRazorpayConfigured = () =>
    !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const getRazorpay = () => {
    if (!isRazorpayConfigured()) throw new Error("Razorpay is not configured");
    if (!client) {
        client = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return client;
};

export const razorpayMode = () =>
    (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_live_") ? "live" : "test";

const safeEqual = (a, b) => {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export const verifyPaymentSignature = ({ orderId, paymentId, signature }, secret = process.env.RAZORPAY_KEY_SECRET) => {
    if (!orderId || !paymentId || !signature || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(expected, signature);
};

// Webhook signature: HMAC_SHA256(raw request body, webhook_secret)
export const verifyWebhookSignature = (rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) => {
    if (!rawBody || !signature || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
};
