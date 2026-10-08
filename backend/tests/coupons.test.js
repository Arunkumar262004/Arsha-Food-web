import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCoupon } from "../services/coupons.js";
import { renderTemplate } from "../services/emailTemplates.js";

const items = [
    { _id: "a1", price: 200, quantity: 2, category: "Cake" },   // 400
    { _id: "b2", price: 100, quantity: 1, category: "Salad" },  // 100
];
const ctx = (over = {}) => ({ items, subtotal: 500, deliveryFee: 2, usedByCustomer: 0, isFirstOrder: false, customerEmail: "a@x.com", ...over });
const base = { isActive: true, usedCount: 0, perCustomerLimit: 1 };

test("percentage discount with cap", () => {
    assert.deepEqual(evaluateCoupon({ ...base, type: "percentage", value: 10 }, ctx()).discount, 50);
    assert.equal(evaluateCoupon({ ...base, type: "percentage", value: 50, maxDiscount: 100 }, ctx()).discount, 100);
});

test("fixed discount never exceeds eligible subtotal", () => {
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 75 }, ctx()).discount, 75);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 900 }, ctx()).discount, 500);
});

test("free shipping", () => {
    const r = evaluateCoupon({ ...base, type: "free_shipping" }, ctx());
    assert.equal(r.ok, true);
    assert.equal(r.freeShipping, true);
    assert.equal(r.discount, 0);
});

test("minimum order amount", () => {
    const r = evaluateCoupon({ ...base, type: "fixed", value: 50, minOrderAmount: 600 }, ctx());
    assert.equal(r.ok, false);
    assert.match(r.message, /₹100 more/);
});

test("dates, active flag, usage limits", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, isActive: false }, ctx()).ok, false);
    assert.match(evaluateCoupon({ ...base, type: "fixed", value: 10, expiresAt: "2026-10-01" }, ctx({ now })).message, /expired/);
    assert.match(evaluateCoupon({ ...base, type: "fixed", value: 10, startsAt: "2026-11-01" }, ctx({ now })).message, /not active yet/);
    assert.match(evaluateCoupon({ ...base, type: "fixed", value: 10, usageLimit: 5, usedCount: 5 }, ctx()).message, /usage limit/);
    assert.match(evaluateCoupon({ ...base, type: "fixed", value: 10 }, ctx({ usedByCustomer: 1 })).message, /already used/);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, perCustomerLimit: 0 }, ctx({ usedByCustomer: 7 })).ok, true);
});

test("first order and specific customers", () => {
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, firstOrderOnly: true }, ctx()).ok, false);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, firstOrderOnly: true }, ctx({ isFirstOrder: true })).ok, true);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, allowedCustomers: ["b@x.com"] }, ctx()).ok, false);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, allowedCustomers: ["A@X.com"] }, ctx()).ok, true);
});

test("category / product restrictions only discount matching items", () => {
    assert.equal(evaluateCoupon({ ...base, type: "percentage", value: 50, applicableCategories: ["Salad"] }, ctx()).discount, 50);
    assert.equal(evaluateCoupon({ ...base, type: "percentage", value: 10, applicableProducts: ["a1"] }, ctx()).discount, 40);
    assert.equal(evaluateCoupon({ ...base, type: "fixed", value: 10, applicableCategories: ["Pasta"] }, ctx()).ok, false);
});

test("email templates escape values and support _html variants", () => {
    const out = renderTemplate("Hi {{customer_name}} — {{order_items}} {{missing}}", {
        customer_name: "<script>x</script>", order_items: "plain", order_items_html: "<b>rich</b>",
    });
    assert.equal(out, "Hi &lt;script&gt;x&lt;/script&gt; — <b>rich</b> ");
    assert.equal(renderTemplate("Hi {{ customer_name }}", { customer_name: "A & B" }, { html: false }), "Hi A & B");
});
