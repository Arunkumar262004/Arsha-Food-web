import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: "" },
  permissions: { type: [String], default: [] },
  // System roles are seeded and cannot be deleted (their permissions can still be edited, except Super Admin).
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
export default Role;
