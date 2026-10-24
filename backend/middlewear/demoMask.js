// Demo sessions see the real admin screens, but never real customer details.
// Every JSON response to a demo admin is passed through maskPII before it leaves the server.

const dots = "•••";
const maskEmail = (e) => {
    const [user, domain] = String(e).split("@");
    if (!domain) return dots;
    return `${user.slice(0, 1)}${dots}@${dots}.${domain.split(".").pop()}`;
};
const maskPhone = (p) => {
    const d = String(p).replace(/\D/g, "");
    return d.length >= 4 ? `${dots}${d.slice(-2)}` : dots;
};
const maskName = (n) => {
    const s = String(n || "").trim();
    return s ? `${s[0].toUpperCase()}${dots}` : s;
};
const maskId = (v) => (v ? `${String(v).slice(0, 6)}${dots}` : v);

const EMAIL_KEYS = new Set(["email", "userEmail", "adminEmail", "to", "by"]);
const PHONE_KEYS = new Set(["phone", "mobile"]);
const ADDRESS_KEYS = new Set(["street", "zipcode", "city"]);
const PERSON_NAME_KEYS = new Set(["firstName", "lastName", "userName", "customer", "customerName"]);
const SECRET_KEYS = new Set(["razorpayPaymentId", "razorpayOrderId", "ip", "lastLoginIp", "messageId"]);

const looksLikePerson = (obj) => obj && typeof obj === "object" && ("email" in obj || "phone" in obj);

export const maskPII = (value, depth = 0) => {
    if (depth > 12 || value === null || typeof value !== "object") return value;
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map((v) => maskPII(v, depth + 1));
    // Mongoose documents and ObjectIds: use their JSON form (an ObjectId becomes a plain string).
    if (typeof value.toJSON === "function" && value.constructor !== Object) {
        value = value.toJSON();
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map((v) => maskPII(v, depth + 1));
    }

    const person = looksLikePerson(value);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (k === "allowedCustomers" && Array.isArray(v)) { out[k] = v.map(maskEmail); continue; }
        // Email log subjects often contain the customer's name.
        if (k === "subject" && typeof v === "string" && typeof value.to === "string") { out[k] = "(subject hidden in demo)"; continue; }
        if (typeof v === "string" && v) {
            if (EMAIL_KEYS.has(k) && v.includes("@")) { out[k] = maskEmail(v); continue; }
            if (PHONE_KEYS.has(k)) { out[k] = maskPhone(v); continue; }
            if (ADDRESS_KEYS.has(k)) { out[k] = dots; continue; }
            if (PERSON_NAME_KEYS.has(k)) { out[k] = maskName(v); continue; }
            if (SECRET_KEYS.has(k)) { out[k] = maskId(v); continue; }
            // "name" is also a dish/category name — only mask it on people (objects that carry an email or phone).
            if (k === "name" && person) { out[k] = maskName(v); continue; }
        }
        out[k] = maskPII(v, depth + 1);
    }
    return out;
};

/** For demo admins: block every change and mask personal data in responses. */
export const demoGuard = (req, res, next) => {
    if (!req.admin?.isDemo) return next();
    const readOnly = ["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path === "/logout";
    if (!readOnly) {
        return res.status(403).json({ success: false, message: "This is a read-only demo — changes aren't saved." });
    }
    const json = res.json.bind(res);
    // The demo's own profile (/me) is not customer data — leave it readable.
    res.json = (body) => json(req.path === "/me" ? body : maskPII(body));
    next();
};
