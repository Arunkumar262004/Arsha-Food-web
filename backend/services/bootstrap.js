import bcrypt from "bcryptjs";
import Role from "../models/Rolemodel.js";
import Admin from "../models/Adminmodel.js";
import Setting from "../models/Settingmodel.js";
import EmailTemplate from "../models/EmailTemplatemodel.js";
import { DEFAULT_ROLES, ALL_PERMISSIONS } from "../config/permissions.js";
import { DEFAULT_TEMPLATES } from "./emailTemplates.js";

import FoodModel from "../models/Foodmodel.js";
import Coupon from "../models/Couponmodel.js";
import ReviewModel from "../models/Reviewmodel.js";

// Idempotent startup seeding: default roles, role for legacy admins, first admin from env, email templates, product image galleries, coupons & reviews.
export const bootstrap = async () => {
    // Permissions already handed out to built-in roles. Newly added permissions are granted to the
    // built-in roles that include them by default — once — so later manual removals are respected.
    const seeded = await Setting.findOne({ key: "seededPermissions" });
    // Databases set up before this tracking existed had every permission except coupons/notifications.
    const alreadySeeded = new Set(seeded?.value || ALL_PERMISSIONS.filter((p) => !/^(coupons|notifications)\./.test(p)));
    const newPerms = ALL_PERMISSIONS.filter((p) => !alreadySeeded.has(p));

    for (const r of DEFAULT_ROLES) {
        const existing = await Role.findOne({ slug: r.slug });
        if (!existing) {
            await Role.create({ ...r, isSystem: true });
        } else if (r.slug === "super-admin") {
            // Super Admin must always keep full access.
            existing.permissions = ["*"];
            existing.isSystem = true;
            await existing.save();
        } else if (newPerms.length) {
            const add = newPerms.filter((p) => r.permissions.includes(p) && !existing.permissions.includes(p));
            if (add.length) {
                existing.permissions.push(...add);
                await existing.save();
            }
        }
    }
    await Setting.updateOne({ key: "seededPermissions" }, { $set: { value: ALL_PERMISSIONS } }, { upsert: true });

    const superAdmin = await Role.findOne({ slug: "super-admin" });

    // Admins created before roles existed become Super Admins so nobody gets locked out.
    await Admin.updateMany({ role: { $exists: false } }, { $set: { role: superAdmin._id } });

    if ((await Admin.countDocuments()) === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        await Admin.create({
            name: "Super Admin",
            email: process.env.ADMIN_EMAIL,
            password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
            role: superAdmin._id,
        });
        console.log(`Seeded first admin: ${process.env.ADMIN_EMAIL}`);
    }

    // Email templates: insert missing ones only; admin edits are kept.
    for (const t of DEFAULT_TEMPLATES) {
        await EmailTemplate.updateOne({ key: t.key }, { $setOnInsert: t }, { upsert: true });
    }

    // Seed default coupons if none exist
    try {
        const defaultCoupons = [
            { code: "ARSHA10", description: "Get 10% OFF on all orders", type: "percentage", value: 10, minOrderAmount: 50, isActive: true },
            { code: "WELCOME10", description: "Welcome discount - 10% OFF", type: "percentage", value: 10, minOrderAmount: 50, isActive: true },
            { code: "ARSHA20", description: "Get 20% OFF on orders over ₹200", type: "percentage", value: 20, minOrderAmount: 200, isActive: true },
            { code: "FREEDEL", description: "Free Delivery on orders over ₹100", type: "free_shipping", value: 0, minOrderAmount: 100, isActive: true },
        ];
        for (const c of defaultCoupons) {
            await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
        }
    } catch (err) {
        console.warn("Error seeding coupons:", err.message);
    }

    // Seed 5-8 photos gallery for products
    try {
        const samplePool = [
            "noodle_1.jpg",
            "noodle_2.jpg",
            "food_1.png",
            "food_2.png",
            "food_3.png",
            "food_4.png",
            "food_5.png",
            "food_6.png",
            "food_7.png",
            "food_8.png",
        ];
        const foods = await FoodModel.find({});
        for (const food of foods) {
            if (!food.images || food.images.length < 5) {
                const combined = [food.image, ...samplePool.filter((x) => x !== food.image)];
                food.images = Array.from(new Set(combined)).slice(0, 8);
                await food.save();
            }
        }

        // Seed sample customer reviews if empty
        if ((await ReviewModel.countDocuments()) === 0 && foods.length > 0) {
            const firstDish = foods[0];
            const secondDish = foods[1] || foods[0];
            await ReviewModel.create([
                {
                    productId: firstDish._id,
                    userId: "user_sample_1",
                    userName: "Praveen Kumar",
                    userEmail: "praveen@example.com",
                    rating: 5,
                    title: "Absolutely Delicious!",
                    comment: `The ${firstDish.name} was so fresh and delicious! Delivery was super fast. Highly recommend!`,
                    isVerifiedPurchase: true,
                    status: "approved",
                },
                {
                    productId: secondDish._id,
                    userId: "user_sample_2",
                    userName: "Ananya Sharma",
                    userEmail: "ananya@example.com",
                    rating: 4,
                    title: "Great Taste & Hot Delivery",
                    comment: `Loved the authentic flavor of ${secondDish.name}. Packaging was neat and clean.`,
                    isVerifiedPurchase: true,
                    status: "pending",
                }
            ]);
        }
    } catch (err) {
        console.warn("Error seeding product image galleries or reviews:", err.message);
    }
};
