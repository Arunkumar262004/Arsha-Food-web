// Default templates seeded on first start. Admins can edit them afterwards; edits are never overwritten.

const layout = (heading, body) => `<!doctype html>
<html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#141a2e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#f26b1d;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">{{store_name}}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${heading}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#f6f8fc;color:#8a93a8;font-size:12px">
You received this email because you ordered from {{store_name}}. Questions? Just reply to this email.
</td></tr>
</table></td></tr></table></body></html>`;

const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4b5468">${t}</p>`;
const button = (label, href) =>
    `<p style="margin:20px 0"><a href="${href}" style="background:#f26b1d;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">${label}</a></p>`;
const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;border:1px solid #e8ecf4;border-radius:12px">
<tr><td style="padding:14px 16px;font-size:14px;color:#4b5468">{{order_items}}</td></tr>
<tr><td style="padding:12px 16px;border-top:1px solid #e8ecf4;font-size:16px;font-weight:bold">Total paid: {{order_total}}</td></tr></table>`;

const ORDER_VARS = ["customer_name", "order_number", "order_total", "order_items", "order_status", "order_url", "store_name"];

export const DEFAULT_TEMPLATES = [
    {
        key: "welcome",
        name: "Welcome email",
        description: "Sent when a customer creates an account.",
        subject: "Welcome to {{store_name}}, {{customer_name}}!",
        variables: ["customer_name", "store_url", "store_name"],
        html: layout("Welcome, {{customer_name}} 👋", p("Thanks for joining {{store_name}}. Fresh food, delivered fast — your first order is a few taps away.") + button("Browse the menu", "{{store_url}}")),
        text: "Welcome to {{store_name}}, {{customer_name}}! Browse the menu: {{store_url}}",
    },
    {
        key: "order_confirmed",
        name: "Order confirmed (payment successful)",
        description: "Sent when Razorpay payment succeeds.",
        subject: "Order {{order_number}} confirmed — thanks, {{customer_name}}!",
        variables: [...ORDER_VARS, "discount", "coupon_code"],
        html: layout("Your order is confirmed", p("Hi {{customer_name}}, we've received your payment and the kitchen is preparing order <strong>{{order_number}}</strong>.") + summary + button("Track your order", "{{order_url}}")),
        text: "Hi {{customer_name}}, order {{order_number}} is confirmed. Total paid: {{order_total}}. Track it: {{order_url}}",
    },
    {
        key: "payment_failed",
        name: "Payment failed",
        description: "Sent when a checkout is closed or the payment fails.",
        subject: "Payment for order {{order_number}} didn't go through",
        variables: [...ORDER_VARS],
        html: layout("Your payment didn't go through", p("Hi {{customer_name}}, the payment for order <strong>{{order_number}}</strong> ({{order_total}}) was not completed, so the order has not been placed.") + p("No money was taken. You can try again any time.") + button("Try again", "{{store_url}}")),
        text: "Hi {{customer_name}}, payment for order {{order_number}} was not completed. Try again: {{store_url}}",
    },
    {
        key: "order_out_for_delivery",
        name: "Out for delivery",
        description: "Sent when an admin sets the status to Out for Delivery.",
        subject: "Order {{order_number}} is on its way 🛵",
        variables: [...ORDER_VARS],
        html: layout("Your food is on the way!", p("Hi {{customer_name}}, order <strong>{{order_number}}</strong> has left our kitchen and will reach you shortly.") + button("Track your order", "{{order_url}}")),
        text: "Hi {{customer_name}}, order {{order_number}} is out for delivery. Track it: {{order_url}}",
    },
    {
        key: "order_delivered",
        name: "Delivered",
        description: "Sent when an admin sets the status to Delivered.",
        subject: "Order {{order_number}} delivered — enjoy your meal!",
        variables: [...ORDER_VARS],
        html: layout("Delivered. Enjoy! 🍽️", p("Hi {{customer_name}}, order <strong>{{order_number}}</strong> has been delivered. We hope you love it.") + button("Order again", "{{store_url}}")),
        text: "Hi {{customer_name}}, order {{order_number}} has been delivered. Enjoy!",
    },
    {
        key: "order_cancelled",
        name: "Order cancelled",
        description: "Sent when an admin sets the status to Cancelled.",
        subject: "Order {{order_number}} has been cancelled",
        variables: [...ORDER_VARS],
        html: layout("Your order was cancelled", p("Hi {{customer_name}}, order <strong>{{order_number}}</strong> ({{order_total}}) has been cancelled.") + p("If you were charged, the refund will be processed to your original payment method. Reply to this email if you have any questions.")),
        text: "Hi {{customer_name}}, order {{order_number}} has been cancelled.",
    },
    {
        key: "coupon_campaign",
        name: "Coupon campaign",
        description: "Send a coupon code to customers from the Coupons page.",
        subject: "{{customer_name}}, here's {{coupon_offer}} on your next order",
        variables: ["customer_name", "coupon_code", "coupon_offer", "coupon_expiry", "store_url", "store_name"],
        html: layout("A treat for you 🎁", p("Hi {{customer_name}}, enjoy <strong>{{coupon_offer}}</strong> on your next order.") +
            `<p style="margin:18px 0;text-align:center"><span style="display:inline-block;border:2px dashed #f26b1d;border-radius:12px;padding:12px 24px;font-size:22px;font-weight:bold;letter-spacing:2px;color:#f26b1d">{{coupon_code}}</span></p>` +
            p("Use the code at checkout. {{coupon_expiry}}") + button("Order now", "{{store_url}}")),
        text: "Hi {{customer_name}}, use code {{coupon_code}} for {{coupon_offer}}. {{coupon_expiry}} {{store_url}}",
    },
];

// Order status → template sent to the customer when an admin changes the status.
export const STATUS_TEMPLATES = {
    "Out for Delivery": "order_out_for_delivery",
    "Delivered": "order_delivered",
    "Cancelled": "order_cancelled",
};

const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Replace {{var}} placeholders. Values are HTML-escaped unless the key ends in _html. */
export const renderTemplate = (str, vars, { html = true } = {}) =>
    String(str || "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, k) => {
        if (html && vars[`${k}_html`] !== undefined) return vars[`${k}_html`];
        const v = vars[k];
        return v === undefined ? "" : html ? escapeHtml(v) : String(v);
    });

export const SAMPLE_VARS = {
    customer_name: "Asha Kumar",
    order_number: "ORD-10042",
    order_total: "₹412.00",
    order_items: "Greek Salad × 2, Chocolate Cake × 1",
    order_items_html: "Greek Salad × 2 — ₹240.00<br>Chocolate Cake × 1 — ₹170.00",
    order_status: "Food Processing",
    discount: "₹50.00",
    coupon_code: "WELCOME50",
    coupon_offer: "₹50 off",
    coupon_expiry: "Valid until 31 Dec 2026.",
};
