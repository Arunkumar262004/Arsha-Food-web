import mongoose from "mongoose";

// A slide in the storefront's home hero. Managed from admin → Marketing → Home Banners.
const bannerSchema = new mongoose.Schema({
    tag: { type: String, default: "", trim: true },            // small italic label above the headline
    title: { type: String, required: true, trim: true },       // headline; wrap words in *stars* to highlight them
    subtitle: { type: String, default: "", trim: true },
    ctaLabel: { type: String, default: "Order now", trim: true },
    ctaLink: { type: String, default: "/#menu", trim: true },  // site path ("/#menu", "/dish/...") or full URL
    secondaryLabel: { type: String, default: "", trim: true }, // optional outline button
    secondaryLink: { type: String, default: "", trim: true },
    bgColor: { type: String, default: "#5b3418" },             // slide background colour
    bigText: { type: String, default: "", trim: true },        // oversized faint word behind the image
    // "cutout" = transparent PNG/WebP floating on the colour; "photo" = regular photo in a rounded frame.
    imageStyle: { type: String, enum: ["cutout", "photo"], default: "cutout" },
    image: { type: String, required: true },
    imageProvider: { type: String, default: "local" },
    imageKey: { type: String },
    // Optional dish shown on the slide with its price and an Add button.
    food: { type: mongoose.Schema.Types.ObjectId, ref: "food" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seedTag: { type: String },
}, { timestamps: true });

bannerSchema.index({ isActive: 1, sortOrder: 1 });

const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
export default Banner;
