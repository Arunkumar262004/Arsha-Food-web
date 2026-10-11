import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // URL name, e.g. "hyderabadi-chicken-dum-biryani" → /dish/hyderabadi-chicken-dum-biryani. Set automatically from the name.
    slug: { type: String, unique: true, sparse: true },
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
    // Sold-out dishes stay on the menu but can't be ordered (admin → Inventory).
    isAvailable: { type: Boolean, default: true },
    // Search engine listing. Empty → the dish name and description are used.
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    // Set on rows created by seed-menu.js so demo items can be removed with `node seed-menu.js --remove`.
    seedTag: { type: String },
    upsells: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
    crossSells: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }]
}, { timestamps: true });

export const slugify = (text) => String(text || "")
    .toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "dish";

// Picks a slug from the name that no other dish uses ("paneer-tikka", then "paneer-tikka-2", ...).
foodSchema.methods.assignSlug = async function () {
    const base = slugify(this.name);
    for (let n = 1; ; n++) {
        const candidate = n === 1 ? base : `${base}-${n}`;
        const taken = await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } });
        if (!taken) { this.slug = candidate; return candidate; }
    }
};

// New dishes and renamed dishes get a fresh slug.
foodSchema.pre("save", async function () {
    if (!this.slug || this.isModified("name")) await this.assignSlug();
});

foodSchema.index({ category: 1 });
foodSchema.index({ name: "text" });

// This prevents model overwrite error during hot reloads
const FoodModel = mongoose.models.food || mongoose.model("food", foodSchema);

export default FoodModel;
