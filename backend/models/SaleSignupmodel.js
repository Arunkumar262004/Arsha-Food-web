import mongoose from "mongoose";

// "Notify me when the sale starts" sign-ups collected on the storefront.
const saleSignupSchema = new mongoose.Schema({
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true },
    name: { type: String, default: "", trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    notifiedAt: { type: Date },                                  // when the "sale is live" email was sent
}, { timestamps: true });

saleSignupSchema.index({ sale: 1, email: 1 }, { unique: true });

const SaleSignup = mongoose.models.SaleSignup || mongoose.model("SaleSignup", saleSignupSchema);
export default SaleSignup;
