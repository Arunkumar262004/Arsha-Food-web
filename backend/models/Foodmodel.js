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
    category: { type: String, required: true }
}, { timestamps: true });

foodSchema.index({ category: 1 });
foodSchema.index({ name: "text" });

// This prevents model overwrite error during hot reloads
const FoodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default FoodModel;
