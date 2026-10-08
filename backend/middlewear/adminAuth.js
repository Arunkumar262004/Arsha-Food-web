import jwt from "jsonwebtoken";
import Admin from "../models/Adminmodel.js";
import { hasPermission } from "../config/permissions.js";

const readToken = (req) => {
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) return auth.slice(7);
    return req.headers.token || null;
};

// Verifies an *admin* JWT (customer tokens are rejected) and loads the admin + role.
export const requireAdmin = async (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Not authorised. Please log in." });

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
    if (payload.type !== "admin") {
        return res.status(401).json({ success: false, message: "Not authorised. Please log in." });
    }

    try {
        const admin = await Admin.findById(payload.id).populate("role");
        if (!admin || !admin.isActive || (admin.tokenVersion || 0) !== (payload.tv || 0)) {
            return res.status(401).json({ success: false, message: "Session is no longer valid. Please log in again." });
        }
        req.admin = admin;
        req.permissions = admin.role?.permissions || [];
        next();
    } catch (err) {
        console.error("Admin auth error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const requirePermission = (...perms) => (req, res, next) => {
    const ok = perms.every(p => hasPermission(req.permissions, p));
    if (!ok) return res.status(403).json({ success: false, message: "You do not have permission to do this." });
    next();
};

// Convenience: admin auth + permission check in one middleware array.
export const adminCan = (...perms) => [requireAdmin, requirePermission(...perms)];
