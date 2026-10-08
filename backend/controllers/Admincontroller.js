import Admin from "../models/Adminmodel.js";
import Role from "../models/Rolemodel.js";
import AuditLog from "../models/AuditLogmodel.js";
import Setting, { SETTING_DEFAULTS, getSettings } from "../models/Settingmodel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import { audit, clientIp } from "../services/audit.js";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "../config/permissions.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const signAdminToken = (admin, remember) => jwt.sign(
  { id: admin._id, type: "admin", tv: admin.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: remember ? "7d" : "12h" }
);

const isStrongPassword = (p) => typeof p === "string" && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageParams = (req, max = 100) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(req.query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// ───────────────────────── Auth ─────────────────────────

// POST /api/admin/login
export const adminLogin = async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const { password, remember } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const admin = await Admin.findOne({ email }).populate("role");
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (admin.isLocked()) {
      const mins = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${mins} min.` });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        admin.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        admin.failedLoginAttempts = 0;
      }
      await admin.save();
      audit(req, { admin, action: "auth.login_failed", entity: "admin", entityId: admin._id });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: "This account has been deactivated" });
    }

    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = clientIp(req);
    await admin.save();
    audit(req, { admin, action: "auth.login", entity: "admin", entityId: admin._id });

    res.json({ success: true, token: signAdminToken(admin, remember), admin: admin.toSafeJSON() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/admin/me
export const getMe = (req, res) => {
  res.json({ success: true, admin: req.admin.toSafeJSON() });
};

// POST /api/admin/logout  (JWTs are stateless; this records the event)
export const adminLogout = (req, res) => {
  audit(req, { action: "auth.logout", entity: "admin", entityId: req.admin._id });
  res.json({ success: true });
};

// POST /api/admin/change-password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!(await bcrypt.compare(currentPassword || "", admin.password))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ success: false, message: "New password must be 8+ characters with letters and numbers" });
    }
    admin.password = await bcrypt.hash(newPassword, 12);
    admin.tokenVersion = (admin.tokenVersion || 0) + 1; // sign out other sessions
    await admin.save();
    audit(req, { action: "auth.password_changed", entity: "admin", entityId: admin._id });
    res.json({ success: true, message: "Password changed", token: signAdminToken(admin, true) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ───────────────────────── Admin users ─────────────────────────

// GET /api/admin/users
export const listAdmins = async (req, res) => {
  const admins = await Admin.find().populate("role").sort({ createdAt: -1 });
  res.json({ success: true, data: admins.map(a => ({ ...a.toSafeJSON(), lastLoginIp: a.lastLoginIp, locked: a.isLocked() })) });
};

// POST /api/admin/users
export const createAdmin = async (req, res) => {
  const { name, email, password, roleId } = req.body;
  if (!name || !validator.isEmail(String(email || ""))) {
    return res.status(400).json({ success: false, message: "Name and a valid email are required" });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ success: false, message: "Password must be 8+ characters with letters and numbers" });
  }
  const role = await Role.findById(roleId).catch(() => null);
  if (!role) return res.status(400).json({ success: false, message: "Select a valid role" });
  if (role.slug === "super-admin" && !req.permissions.includes("*")) {
    return res.status(403).json({ success: false, message: "Only a Super Admin can create Super Admins" });
  }
  if (await Admin.exists({ email: email.toLowerCase() })) {
    return res.status(409).json({ success: false, message: "An admin with this email already exists" });
  }

  const admin = await Admin.create({
    name, email, role: role._id, password: await bcrypt.hash(password, 12),
  });
  audit(req, { action: "admin.create", entity: "admin", entityId: admin._id, newData: { name, email, role: role.slug } });
  res.status(201).json({ success: true, message: "Admin created" });
};

// PUT /api/admin/users/:id   { name?, roleId?, isActive?, password?, unlock? }
export const updateAdmin = async (req, res) => {
  const admin = await Admin.findById(req.params.id).populate("role").catch(() => null);
  if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

  const isSelf = String(admin._id) === String(req.admin._id);
  const callerIsSuper = req.permissions.includes("*");
  if (admin.role?.slug === "super-admin" && !callerIsSuper) {
    return res.status(403).json({ success: false, message: "Only a Super Admin can edit a Super Admin" });
  }

  const before = { name: admin.name, role: admin.role?.slug, isActive: admin.isActive };
  const { name, roleId, isActive, password, unlock } = req.body;

  if (name !== undefined) admin.name = String(name).trim();
  if (roleId !== undefined) {
    if (isSelf) return res.status(400).json({ success: false, message: "You cannot change your own role" });
    const role = await Role.findById(roleId).catch(() => null);
    if (!role) return res.status(400).json({ success: false, message: "Select a valid role" });
    if (role.slug === "super-admin" && !callerIsSuper) {
      return res.status(403).json({ success: false, message: "Only a Super Admin can grant Super Admin" });
    }
    admin.role = role._id;
  }
  if (isActive !== undefined) {
    if (isSelf && !isActive) return res.status(400).json({ success: false, message: "You cannot deactivate yourself" });
    admin.isActive = !!isActive;
    if (!isActive) admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  }
  if (password !== undefined) {
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be 8+ characters with letters and numbers" });
    }
    admin.password = await bcrypt.hash(password, 12);
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  }
  if (unlock) { admin.lockUntil = undefined; admin.failedLoginAttempts = 0; }

  await admin.save();
  await admin.populate("role");
  audit(req, {
    action: "admin.update", entity: "admin", entityId: admin._id, oldData: before,
    newData: { name: admin.name, role: admin.role?.slug, isActive: admin.isActive, passwordReset: password !== undefined },
  });
  res.json({ success: true, message: "Admin updated" });
};

// ───────────────────────── Roles & permissions ─────────────────────────

// GET /api/admin/permissions
export const listPermissions = (req, res) => {
  res.json({ success: true, data: PERMISSION_GROUPS });
};

// GET /api/admin/roles
export const listRoles = async (req, res) => {
  const [roles, counts] = await Promise.all([
    Role.find().sort({ isSystem: -1, name: 1 }).lean(),
    Admin.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]),
  ]);
  const byRole = Object.fromEntries(counts.map(c => [String(c._id), c.n]));
  res.json({ success: true, data: roles.map(r => ({ ...r, adminCount: byRole[String(r._id)] || 0 })) });
};

const cleanPermissions = (perms) =>
  Array.isArray(perms) ? [...new Set(perms.filter(p => ALL_PERMISSIONS.includes(p)))] : [];

// POST /api/admin/roles
export const createRole = async (req, res) => {
  const { name, description } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: "Role name is required" });
  const slug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (await Role.exists({ slug })) return res.status(409).json({ success: false, message: "A role with this name exists" });

  const role = await Role.create({ name: name.trim(), slug, description, permissions: cleanPermissions(req.body.permissions) });
  audit(req, { action: "role.create", entity: "role", entityId: role._id, newData: role.toObject() });
  res.status(201).json({ success: true, message: "Role created" });
};

// PUT /api/admin/roles/:id
export const updateRole = async (req, res) => {
  const role = await Role.findById(req.params.id).catch(() => null);
  if (!role) return res.status(404).json({ success: false, message: "Role not found" });
  if (role.slug === "super-admin") return res.status(400).json({ success: false, message: "Super Admin always has full access" });

  const before = role.toObject();
  if (req.body.name !== undefined) role.name = String(req.body.name).trim();
  if (req.body.description !== undefined) role.description = req.body.description;
  if (req.body.permissions !== undefined) role.permissions = cleanPermissions(req.body.permissions);
  await role.save();
  audit(req, { action: "role.update", entity: "role", entityId: role._id, oldData: before, newData: role.toObject() });
  res.json({ success: true, message: "Role updated" });
};

// DELETE /api/admin/roles/:id
export const deleteRole = async (req, res) => {
  const role = await Role.findById(req.params.id).catch(() => null);
  if (!role) return res.status(404).json({ success: false, message: "Role not found" });
  if (role.isSystem) return res.status(400).json({ success: false, message: "Built-in roles cannot be deleted" });
  if (await Admin.exists({ role: role._id })) {
    return res.status(400).json({ success: false, message: "Reassign the admins using this role first" });
  }
  await role.deleteOne();
  audit(req, { action: "role.delete", entity: "role", entityId: role._id, oldData: role.toObject() });
  res.json({ success: true, message: "Role deleted" });
};

// ───────────────────────── Audit logs ─────────────────────────

// GET /api/admin/audit-logs?page&limit&action&entity&q
export const listAuditLogs = async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), "i");
    filter.$or = [{ adminEmail: rx }, { action: rx }, { entityId: rx }];
  }
  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, page, limit, total });
};

// ───────────────────────── Business Settings ─────────────────────────

// GET /api/admin/settings
export const getAdminSettings = async (req, res) => {
  try {
    const keys = Object.keys(SETTING_DEFAULTS);
    const data = await getSettings(keys);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching settings" });
  }
};

// PUT /api/admin/settings
export const updateAdminSettings = async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Setting.updateOne({ key }, { $set: { value } }, { upsert: true });
    }
    audit(req, { action: "settings.update", entity: "setting", newData: updates });
    const keys = Object.keys(SETTING_DEFAULTS);
    const data = await getSettings(keys);
    res.json({ success: true, message: "Settings updated successfully", data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating settings" });
  }
};
