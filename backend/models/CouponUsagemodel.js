import mongoose from "mongoose";

// One row per paid order that used a coupon (written when payment succeeds).
const couponUsageSchema = new mongoose.Schema({
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    code: { type: String, required: true },
    userId: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    orderNumber: { type: String },
    discount: { type: Number, required: true },
}, { timestamps: { createdAt: "usedAt", updatedAt: false } });

couponUsageSchema.index({ coupon: 1, userId: 1 });
couponUsageSchema.index({ coupon: 1, usedAt: -1 });

const CouponUsage = mongoose.models.CouponUsage || mongoose.model("CouponUsage", couponUsageSchema);
export default CouponUsage;
