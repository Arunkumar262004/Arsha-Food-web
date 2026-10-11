import Banner from "../models/Bannermodel.js";
import * as storage from "../services/storage.js";
import { audit } from "../services/audit.js";

const FOOD_FIELDS = "name slug price image category isVeg tag";
const LINK = /^(\/|https?:\/\/)/i;

// Validates the admin form (multipart, so every value arrives as a string). Returns { data } or { error }.
const parseBanner = (b, { partial = false } = {}) => {
    const data = {};
    const str = (k, max) => { if (b[k] !== undefined) data[k] = String(b[k]).trim().slice(0, max); };
    str("tag", 60); str("title", 120); str("subtitle", 260); str("ctaLabel", 30); str("ctaLink", 300);
    str("secondaryLabel", 30); str("secondaryLink", 300); str("bigText", 16);

    if ((!partial || b.title !== undefined) && !data.title) return { error: "Headline is required" };
    for (const k of ["ctaLink", "secondaryLink"]) {
        if (data[k] && !LINK.test(data[k])) return { error: "Links must start with / (a page on this site) or https://" };
    }
    if (data.secondaryLabel && !data.secondaryLink) return { error: "Add a link for the second button" };
    if (b.bgColor !== undefined) {
        if (!/^#[0-9a-f]{6}$/i.test(b.bgColor)) return { error: "Background must be a colour like #5b3418" };
        data.bgColor = b.bgColor.toLowerCase();
    }
    if (b.imageStyle !== undefined) {
        if (!["cutout", "photo"].includes(b.imageStyle)) return { error: "Choose an image style" };
        data.imageStyle = b.imageStyle;
    }
    if (b.food !== undefined) {
        if (b.food && !/^[a-f0-9]{24}$/i.test(b.food)) return { error: "Choose a valid dish" };
        data.food = b.food || null;
    }
    if (b.isActive !== undefined) data.isActive = b.isActive === true || b.isActive === "true";
    return { data };
};

const firstFile = (req) => (req.files && req.files[0]) || req.file;

// GET /api/banners — active slides for the storefront
export const listPublicBanners = async (req, res) => {
    const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 })
        .populate("food", FOOD_FIELDS).lean();
    res.json({ success: true, data: banners });
};

// GET /api/admin/banners
export const listBanners = async (req, res) => {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).populate("food", FOOD_FIELDS).lean();
    res.json({ success: true, data: banners });
};

// POST /api/admin/banners (multipart: fields + one image)
export const createBanner = async (req, res) => {
    const file = firstFile(req);
    if (!file) return res.status(400).json({ success: false, message: "Upload an image for the banner" });
    const { data, error } = parseBanner(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const stored = await storage.upload(file, "banners");
    const last = await Banner.findOne().sort({ sortOrder: -1 }).lean();
    const banner = await Banner.create({
        ...data, image: stored.url, imageProvider: stored.provider, imageKey: stored.key,
        sortOrder: (last?.sortOrder ?? -1) + 1,
    });
    audit(req, { action: "banner.create", entity: "banner", entityId: banner._id, newData: { title: banner.title } });
    res.json({ success: true, message: "Banner created", data: banner });
};

// PUT /api/admin/banners/:id (multipart or JSON; image optional)
export const updateBanner = async (req, res) => {
    const banner = await Banner.findById(req.params.id).catch(() => null);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    const { data, error } = parseBanner(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });

    const old = { title: banner.title, isActive: banner.isActive };
    const file = firstFile(req);
    if (file) {
        const stored = await storage.upload(file, "banners");
        await storage.remove({ provider: banner.imageProvider, key: banner.imageKey || banner.image });
        Object.assign(data, { image: stored.url, imageProvider: stored.provider, imageKey: stored.key });
    }
    Object.assign(banner, data);
    await banner.save();
    audit(req, { action: "banner.update", entity: "banner", entityId: banner._id, oldData: old, newData: { title: banner.title, isActive: banner.isActive } });
    res.json({ success: true, message: "Banner updated", data: banner });
};

// PUT /api/admin/banners/reorder  { ids: [...] } — new display order
export const reorderBanners = async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((id) => /^[a-f0-9]{24}$/i.test(id)) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "Nothing to reorder" });
    await Banner.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })));
    audit(req, { action: "banner.reorder", entity: "banner", newData: { ids } });
    res.json({ success: true, message: "Order saved" });
};

// DELETE /api/admin/banners/:id
export const deleteBanner = async (req, res) => {
    const banner = await Banner.findByIdAndDelete(req.params.id).catch(() => null);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    await storage.remove({ provider: banner.imageProvider, key: banner.imageKey || banner.image });
    audit(req, { action: "banner.delete", entity: "banner", entityId: banner._id, oldData: { title: banner.title } });
    res.json({ success: true, message: "Banner deleted" });
};
