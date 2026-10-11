import mongoose from "mongoose";

// Menu categories (admin → Catalog → Categories). Dishes reference a category by its name.
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },          // full URL or a filename under /images
    imageProvider: { type: String, default: "external" },
    imageKey: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },     // hidden categories disappear from the storefront
}, { timestamps: true });

categorySchema.index({ sortOrder: 1 });

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
