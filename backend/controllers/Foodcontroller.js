import FoodModel from '../models/Foodmodel.js';
import { withSalePricing } from '../services/sales.js';
import * as storage from '../services/storage.js';
import { audit } from '../services/audit.js';

// Multipart fields arrive as strings: "true"/"false" for flags.
const bool = (v) => v === true || v === "true";
const readFlags = (body) => {
    const out = {};
    if (body.isVeg !== undefined) out.isVeg = bool(body.isVeg);
    if (body.isAvailable !== undefined) out.isAvailable = bool(body.isAvailable);
    if (body.tag !== undefined) out.tag = String(body.tag).trim().slice(0, 24);
    if (body.seoTitle !== undefined) out.seoTitle = String(body.seoTitle).trim().slice(0, 70);
    if (body.seoDescription !== undefined) out.seoDescription = String(body.seoDescription).trim().slice(0, 170);
    return out;
};

// Add food item with support for multiple images
const addfood = async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files.length) {
            return res.status(400).json({ success: false, message: "No image file uploaded" });
        }

        const { name, description, category } = req.body;
        const price = Number(req.body.price);
        if (!name || !description || !category || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({ success: false, message: "Name, description, category and a valid price are required" });
        }

        const imageUrls = [];
        let primaryStored = null;

        for (let i = 0; i < files.length; i++) {
            const stored = await storage.upload(files[i], "foods");
            imageUrls.push(stored.url);
            if (i === 0) primaryStored = stored;
        }

        const parseArr = (val) => {
            if (!val) return [];
            try {
                const parsed = typeof val === "string" ? JSON.parse(val) : val;
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
            }
        };

        const upsells = parseArr(req.body.upsells);
        const crossSells = parseArr(req.body.crossSells);
        const relatedProducts = parseArr(req.body.relatedProducts);

        const food = new FoodModel({
            name,
            description,
            price,
            category,
            image: imageUrls[0],
            images: imageUrls,
            imageProvider: primaryStored?.provider || "local",
            imageKey: primaryStored?.key,
            upsells,
            crossSells,
            relatedProducts,
            ...readFlags(req.body),
        });

        await food.save();
        audit(req, { action: "product.create", entity: "food", entityId: food._id, newData: { name, price, category, imagesCount: imageUrls.length } });
        res.json({ success: true, message: "Food Added", data: food });

    } catch (error) {
        console.error("Add food error:", error.message);
        res.status(500).json({ success: false, message: "Error adding food item" });
    }
};

// all food
const listfood = async (req, res) => {
    try {
        const foods = await FoodModel.find({}).sort({ createdAt: -1 });
        // The storefront asks for live pricing (sale prices applied); the admin always edits regular prices.
        res.json({ success: true, data: req.query.pricing === "live" ? await withSalePricing(foods) : foods });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// remove food 
const remove_food = async (req, res) => {
    try {
        const food = await FoodModel.findById(req.body.id);
        if (!food) {
            return res.status(404).json({ success: false, message: "Food not found" });
        }
        await storage.remove({ provider: food.imageProvider || "local", key: food.imageKey || food.image });
        await FoodModel.findByIdAndDelete(req.body.id);
        audit(req, { action: "product.delete", entity: "food", entityId: food._id, oldData: { name: food.name, price: food.price, category: food.category } });
        res.json({ success: true, message: "Food Removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

const fetch_view_food = async (req, res) => {
    try {
        // Accepts the dish's readable slug (/dish/paneer-tikka) or, for old links, its id.
        const key = req.params.id;
        const query = /^[a-f0-9]{24}$/i.test(key) ? FoodModel.findById(key) : FoodModel.findOne({ slug: key.toLowerCase() });
        const fetch_Id = await query
            .populate('upsells', 'name slug price image category description isVeg tag')
            .populate('crossSells', 'name slug price image category description isVeg tag')
            .populate('relatedProducts', 'name slug price image category description isVeg tag');
        const dataid = fetch_Id && req.query.pricing === "live" ? (await withSalePricing([fetch_Id]))[0] : fetch_Id;
        res.json({ success: true, dataid });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "error" });
    }
};

// POST /api/food/availability  { ids: [...], isAvailable }  — mark dishes sold out / back in stock
const set_availability = async (req, res) => {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : [req.body.id]).filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
    if (!ids.length) return res.status(400).json({ success: false, message: "Choose at least one dish" });
    const isAvailable = bool(req.body.isAvailable);
    const r = await FoodModel.updateMany({ _id: { $in: ids } }, { $set: { isAvailable } });
    audit(req, { action: isAvailable ? "product.restock" : "product.soldout", entity: "food", newData: { ids, isAvailable } });
    res.json({ success: true, message: `${r.modifiedCount} dish${r.modifiedCount === 1 ? "" : "es"} marked ${isAvailable ? "available" : "sold out"}` });
};

// update food item
const update_food = async (req, res) => {
    try {
        const id = req.body.id || req.body._id;
        const food = await FoodModel.findById(id);
        if (!food) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const { name, description, category } = req.body;
        const price = Number(req.body.price);

        if (name) food.name = name;
        if (description) food.description = description;
        if (category) food.category = category;
        if (Number.isFinite(price) && price >= 0) food.price = price;
        Object.assign(food, readFlags(req.body));

        const parseArr = (val) => {
            if (!val) return null;
            try {
                const parsed = typeof val === "string" ? JSON.parse(val) : val;
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return typeof val === "string" ? val.split(",").map(s => s.trim()).filter(Boolean) : [];
            }
        };

        if (req.body.upsells !== undefined) food.upsells = parseArr(req.body.upsells);
        if (req.body.crossSells !== undefined) food.crossSells = parseArr(req.body.crossSells);
        if (req.body.relatedProducts !== undefined) food.relatedProducts = parseArr(req.body.relatedProducts);

        let currentImages = food.images && food.images.length ? [...food.images] : [food.image];
        if (req.body.existingImages !== undefined) {
            try {
                const parsed = typeof req.body.existingImages === "string"
                    ? JSON.parse(req.body.existingImages)
                    : req.body.existingImages;
                if (Array.isArray(parsed)) currentImages = parsed;
            } catch (e) {
                console.warn("Could not parse existingImages", e);
            }
        }

        const files = req.files || (req.file ? [req.file] : []);
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const stored = await storage.upload(files[i], "foods");
                currentImages.push(stored.url);
            }
        }

        currentImages = Array.from(new Set(currentImages)).slice(0, 10);

        if (currentImages.length > 0) {
            food.image = currentImages[0];
            food.images = currentImages;
        }

        await food.save();
        audit(req, { action: "product.update", entity: "food", entityId: food._id, newData: { name: food.name, price: food.price, category: food.category, imagesCount: currentImages.length } });
        res.json({ success: true, message: "Product updated successfully", data: food });
    } catch (error) {
        console.error("Update food error:", error.message);
        res.status(500).json({ success: false, message: "Error updating product" });
    }
};

export { addfood, listfood, remove_food, fetch_view_food, update_food, set_availability };
