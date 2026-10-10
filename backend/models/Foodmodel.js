import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    // Either a full public URL (Supabase Storage) or, for older items, a filename under /images.
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    // Storage provider + object key, so the file can be deleted when the item is removed.
    imageProvider: { type: String, default: "local" },
    imageKey: { type: String },
    category: { type: String, required: true },
    // Veg / non-veg mark shown on cards (Indian food-labelling convention) and an optional badge like "Bestseller".
    isVeg: { type: Boolean, default: true },
    tag: { type: String, default: "" },
    // Set on rows created by seed-menu.js so demo items can be removed with `node seed-menu.js --remove`.
    seedTag: { type: String },
    upsells: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
    crossSells: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }]
}, { timestamps: true });

foodSchema.index({ category: 1 });
foodSchema.index({ name: "text" });

// This prevents model overwrite error during hot reloads
const FoodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default FoodModel;
