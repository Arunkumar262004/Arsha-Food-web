import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, default: "Admin", trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
  isActive: { type: Boolean, default: true },

  // Login tracking / lockout
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  // Bumped on password change so older JWTs stop working.
  tokenVersion: { type: Number, default: 0 },

  // Reserved for optional 2FA (TOTP); not enforced yet.
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true });

adminSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

adminSchema.methods.toSafeJSON = function () {
  const role = this.role && this.role.permissions ? this.role : null;
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    role: role ? { id: role._id, name: role.name, slug: role.slug } : null,
    permissions: role ? role.permissions : [],
    createdAt: this.createdAt,
  };
};

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
