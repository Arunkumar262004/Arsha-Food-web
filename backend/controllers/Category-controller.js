import Category from "../models/Categorymodel.js";
import FoodModel from "../models/Foodmodel.js";
import Coupon from "../models/Couponmodel.js";
import * as storage from "../services/storage.js";
import { audit } from "../services/audit.js";

const countsByCategory = async () => {
    const rows = await FoodModel.aggregate([
        { $group: { _id: "$category", dishes: { $sum: 1 }, available: { $sum: { $cond: [{ $eq: ["$isAvailable", false] }, 0, 1] } } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r]));
};

const withCounts = async (cats) => {
    const counts = await countsByCategory();
    return cats.map((c) => ({ ...c, dishes: counts[c.name]?.dishes || 0, available: counts[c.name]?.available || 0 }));
};

const parse = (b) => {
    const data = {};
    if (b.name !== undefined) {
        data.name = String(b.name).trim().replace(/\s+/g, " ").slice(0, 40);
        if (!data.name) return { error: "Category name is required" };
    }
    if (b.description !== undefined) data.description = String(b.description).trim().slice(0, 200);
    if (b.isActive !== undefined) data.isActive = b.isActive === true || b.isActive === "true";
    if (b.imageUrl !== undefined && b.imageUrl) {
        if (!/^https:\/\//i.test(b.imageUrl)) return { error: "Image link must start with https://" };
        Object.assign(data, { image: String(b.imageUrl).trim(), imageProvider: "external", imageKey: undefined });
    }
    return { data };
};

const firstFile = (req) => (req.files && req.files[0]) || req.file;
const nameTaken = (name, exceptId) =>
    Category.exists({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), ...(exceptId ? { _id: { $ne: exceptId } } : {}) });

// GET /api/categories — visible categories, in menu order, with dish counts (storefront)
export const listPublicCategories = async (req, res) => {
    const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    const data = (await withCounts(cats)).filter((c) => c.dishes > 0)
        .map(({ name, description, image, dishes, available }) => ({ name, description, image, dishes, available }));
    res.json({ success: true, data });
};

// GET /api/admin/categories
export const listCategories = async (req, res) => {
    const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ success: true, data: await withCounts(cats) });
};

// POST /api/admin/categories (multipart; image optional)
export const createCategory = async (req, res) => {
    const { data, error } = parse(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!data.name) return res.status(400).json({ success: false, message: "Category name is required" });
    if (await nameTaken(data.name)) return res.status(409).json({ success: false, message: `"${data.name}" already exists` });

    const file = firstFile(req);
    if (file) {
        const stored = await storage.upload(file, "categories");
        Object.assign(data, { image: stored.url, imageProvider: stored.provider, imageKey: stored.key });
    }
    const last = await Category.findOne().sort({ sortOrder: -1 }).lean();
    const cat = await Category.create({ ...data, sortOrder: (last?.sortOrder ?? -1) + 1 });
    audit(req, { action: "category.create", entity: "category", entityId: cat._id, newData: { name: cat.name } });
    res.json({ success: true, message: "Category created", data: cat });
};

// PUT /api/admin/categories/:id — renaming also moves every dish (and coupon rule) to the new name
export const updateCategory = async (req, res) => {
    const cat = await Category.findById(req.params.id).catch(() => null);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    const { data, error } = parse(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const oldName = cat.name;
    if (data.name && data.name !== oldName && await nameTaken(data.name, cat._id)) {
        return res.status(409).json({ success: false, message: `"${data.name}" already exists` });
    }
    const file = firstFile(req);
    if (file) {
        const stored = await storage.upload(file, "categories");
        if (cat.imageProvider !== "external") await storage.remove({ provider: cat.imageProvider, key: cat.imageKey || cat.image });
        Object.assign(data, { image: stored.url, imageProvider: stored.provider, imageKey: stored.key });
    }
    Object.assign(cat, data);
    await cat.save();

    let moved = 0;
    if (data.name && data.name !== oldName) {
        moved = (await FoodModel.updateMany({ category: oldName }, { $set: { category: data.name } })).modifiedCount;
        await Coupon.updateMany({ applicableCategories: oldName }, { $set: { "applicableCategories.$": data.name } });
    }
    audit(req, { action: "category.update", entity: "category", entityId: cat._id, oldData: { name: oldName }, newData: { name: cat.name, isActive: cat.isActive } });
    res.json({ success: true, message: moved ? `Category renamed and ${moved} dish${moved === 1 ? "" : "es"} moved` : "Category updated", data: cat });
};

// PUT /api/admin/categories/reorder  { ids: [...] }
export const reorderCategories = async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((id) => /^[a-f0-9]{24}$/i.test(id)) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "Nothing to reorder" });
    await Category.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })));
    audit(req, { action: "category.reorder", entity: "category", newData: { ids } });
    res.json({ success: true, message: "Menu order saved" });
};

// DELETE /api/admin/categories/:id — only when no dish uses it
export const deleteCategory = async (req, res) => {
    const cat = await Category.findById(req.params.id).catch(() => null);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    const dishes = await FoodModel.countDocuments({ category: cat.name });
    if (dishes) {
        return res.status(409).json({ success: false, message: `${dishes} dish${dishes === 1 ? " is" : "es are"} still in "${cat.name}". Move or delete them first, or hide the category instead.` });
    }
    await cat.deleteOne();
    if (cat.imageProvider !== "external") await storage.remove({ provider: cat.imageProvider, key: cat.imageKey || cat.image });
    audit(req, { action: "category.delete", entity: "category", entityId: cat._id, oldData: { name: cat.name } });
    res.json({ success: true, message: "Category deleted" });
};

// Startup: make sure every category used by a dish has a record (first run imports the existing menu).
const DEFAULT_PHOTOS = {
    Biryani: "1633945274405-b6c8069047b0", Meals: "1625398407796-82650a8c135f", "South Indian": "1668236543090-82eba5ee5976",
    Starters: "1610057099443-fde8c4d50f91", Snacks: "1601050690597-df0568f70950", "Burgers & Pizza": "1568901346375-23c9450c58cd",
    Rolls: "1626700051175-6818013e1d4f", Sandwich: "1528735602780-2552fd46c7af", Noodles: "1569718212165-3a8278d5f624",
    Pasta: "1608897013039-887f21d8c804", "Pure Veg": "1631452180519-c014fe946bc7", Salad: "1540420773420-3366772f4999",
    "Cool Drinks": "1551538827-9c037cb4f32a", "Juices & Shakes": "1572490122747-3968b75cc699", "Coffee & Tea": "1509042239860-f550ce710b93",
    Cake: "1578985545062-69928b1d9587", Deserts: "1563805042-7684c019e1cb",
};
const DEFAULT_ORDER = Object.keys(DEFAULT_PHOTOS);

export const syncCategories = async () => {
    const used = await FoodModel.distinct("category");
    const existing = new Set((await Category.find({}, { name: 1 }).lean()).map((c) => c.name));
    const missing = used.filter((n) => n && !existing.has(n))
        .sort((a, b) => (DEFAULT_ORDER.indexOf(a) + 1 || 99) - (DEFAULT_ORDER.indexOf(b) + 1 || 99));
    if (!missing.length) return;
    const last = await Category.findOne().sort({ sortOrder: -1 }).lean();
    let order = (last?.sortOrder ?? -1) + 1;
    for (const name of missing) {
        const photo = DEFAULT_PHOTOS[name];
        // Upsert so two imports running at once (startup + first admin visit) can't collide.
        await Category.updateOne({ name }, { $setOnInsert: {
            name, sortOrder: order++,
            image: photo ? `https://images.unsplash.com/photo-${photo}?w=700&q=70&auto=format&fit=crop` : "",
        } }, { upsert: true }).catch((err) => { if (err.code !== 11000) throw err; });
    }
    console.log(`Categories: imported ${missing.length} from the menu`);
};
