import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "../services/razorpay.js";
import { hasPermission, DEFAULT_ROLES, ALL_PERMISSIONS } from "../config/permissions.js";
import { resolveRange } from "../controllers/Dashboard-controller.js";

const SECRET = "test_secret";

test("razorpay checkout signature: valid passes, tampered fails", () => {
    const sig = crypto.createHmac("sha256", SECRET).update("order_1|pay_1").digest("hex");
    assert.equal(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig }, SECRET), true);
    assert.equal(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_2", signature: sig }, SECRET), false);
    assert.equal(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: "short" }, SECRET), false);
    assert.equal(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sig }, ""), false);
});

test("razorpay webhook signature over raw body", () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    const sig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    assert.equal(verifyWebhookSignature(body, sig, SECRET), true);
    assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), sig, SECRET), false);
});

test("permissions: super admin wildcard, restricted roles denied", () => {
    const role = (slug) => DEFAULT_ROLES.find(r => r.slug === slug).permissions;
    for (const p of ALL_PERMISSIONS) assert.equal(hasPermission(role("super-admin"), p), true);
    assert.equal(hasPermission(role("customer-support"), "products.delete"), false);
    assert.equal(hasPermission(role("accountant"), "orders.update"), false);
    assert.equal(hasPermission(role("admin"), "roles.manage"), false);
    assert.equal(hasPermission(role("order-manager"), "orders.update"), true);
    // every default role only references real permissions
    for (const r of DEFAULT_ROLES) for (const p of r.permissions) assert.ok(p === "*" || ALL_PERMISSIONS.includes(p), p);
});

test("dashboard ranges (Asia/Kolkata)", () => {
    const now = new Date("2026-10-08T10:00:00Z"); // 15:30 IST
    const today = resolveRange("today", null, null, now);
    assert.equal(today.start.toISOString(), "2026-10-07T18:30:00.000Z");
    assert.equal(today.end - today.start, 86400000);
    const week = resolveRange("7d", null, null, now);
    assert.equal(week.end - week.start, 7 * 86400000);
    const prev = resolveRange("prevmonth", null, null, now);
    assert.equal(prev.start.toISOString(), "2026-08-31T18:30:00.000Z");
    assert.equal(prev.end.toISOString(), "2026-09-30T18:30:00.000Z");
    const custom = resolveRange("custom", "2026-10-01", "2026-10-03", now);
    assert.equal(custom.end - custom.start, 3 * 86400000);
    // invalid custom input falls back to last 7 days
    assert.equal(resolveRange("custom", "bad", "2026-10-03", now).end - resolveRange("custom", "bad", "x", now).start, 7 * 86400000);
});
