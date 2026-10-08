import AuditLog from "../models/AuditLogmodel.js";

const SECRET_FIELDS = /pass(word)?|secret|token|key/i;

// Never persist secrets in audit data.
const scrub = (data) => {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map(scrub);
    const out = {};
    for (const [k, v] of Object.entries(data)) {
        out[k] = SECRET_FIELDS.test(k) ? "[redacted]" : scrub(v);
    }
    return out;
};

export const clientIp = (req) =>
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || req.socket?.remoteAddress;

// Fire-and-forget: an audit write failure must never break the admin action.
export const audit = (req, { action, entity, entityId, oldData, newData, admin }) => {
    const actor = admin || req.admin;
    AuditLog.create({
        admin: actor?._id,
        adminEmail: actor?.email,
        action,
        entity,
        entityId: entityId ? String(entityId) : undefined,
        oldData: scrub(oldData),
        newData: scrub(newData),
        ip: clientIp(req),
        userAgent: req.headers["user-agent"],
    }).catch(err => console.warn("Audit log write failed:", err.message));
};
