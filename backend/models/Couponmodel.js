import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: "" },

    // Discount
    type: { type: String, enum: ["percentage", "fixed", "free_shipping"], required: true },
    value: { type: Number, default: 0 },                // % for percentage, ₹ for fixed
    maxDiscount: { type: Number },                      // cap for percentage coupons

    // Conditions
    minOrderAmount: { type: Number, default: 0 },       // on items subtotal
    firstOrderOnly: { type: Boolean, default: false },
    applicableProducts: { type: [String], default: [] },   // food ids; empty = all
    applicableCategories: { type: [String], default: [] }, // category names; empty = all
    allowedCustomers: { type: [String], default: [] },     // customer emails; empty = everyone

    // Limits
    usageLimit: { type: Number },                       // total redemptions; empty = unlimited
    perCustomerLimit: { type: Number, default: 1 },     // empty/0 = unlimited
    usedCount: { type: Number, default: 0 },

    startsAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ isActive: 1, expiresAt: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
export default Coupon;
