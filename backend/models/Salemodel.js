import mongoose from "mongoose";

// Festival / limited-time sale (admin → Marketing → Festival Sales).
// Before startsAt the storefront shows the dishes locked; between startsAt and endsAt the sale prices are charged.
const saleItemSchema = new mongoose.Schema({
    food: { type: mongoose.Schema.Types.ObjectId, ref: "food", required: true },
    salePrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },          // "Diwali Sale"
    tagline: { type: String, default: "", trim: true },          // "Festive feasts at festive prices"
    description: { type: String, default: "", trim: true },
    themeColor: { type: String, default: "#b8322a" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    items: { type: [saleItemSchema], default: [] },
    isActive: { type: Boolean, default: true },                  // paused sales are hidden and never charged
    startEmailSentAt: { type: Date },                            // set once the "sale is live" emails go out
}, { timestamps: true });

saleSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

const Sale = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
export default Sale;
