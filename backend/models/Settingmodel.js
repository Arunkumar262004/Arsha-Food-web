import mongoose from "mongoose";

// Simple key/value store for configurable business rules (delivery fee, currency, ...).
// Only keys listed in PUBLIC_SETTING_KEYS are ever returned to the storefront.
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

export const SETTING_DEFAULTS = {
  currency: "INR",
  currencySymbol: "₹",
  deliveryFee: 40,
  freeDeliveryThreshold: 499,
};

export const PUBLIC_SETTING_KEYS = ["currency", "currencySymbol", "deliveryFee", "freeDeliveryThreshold"];

export const getSettings = async (keys = Object.keys(SETTING_DEFAULTS)) => {
  const rows = await Setting.find({ key: { $in: keys } }).lean();
  const out = {};
  for (const k of keys) out[k] = SETTING_DEFAULTS[k];
  for (const r of rows) out[r.key] = r.value;
  return out;
};

export default Setting;
