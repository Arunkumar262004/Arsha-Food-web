import express from "express";
import rateLimit from "express-rate-limit";
import {
  adminLogin, adminLogout, getMe, changePassword,
  listAdmins, createAdmin, updateAdmin,
  listPermissions, listRoles, createRole, updateRole, deleteRole,
  listAuditLogs, getAdminSettings, updateAdminSettings, demoStatus, demoLogin,
} from "../controllers/Admincontroller.js";
import { getDashboard, getSystemStatus } from "../controllers/Dashboard-controller.js";
import { requireAdmin, adminCan } from "../middlewear/adminAuth.js";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, couponUsages, sendCouponCampaign } from "../controllers/Coupon-controller.js";
import { listBanners, createBanner, updateBanner, reorderBanners, deleteBanner } from "../controllers/Banner-controller.js";
import { listCategories, createCategory, updateCategory, reorderCategories, deleteCategory, syncCategories } from "../controllers/Category-controller.js";
import { listCustomers, getCustomer } from "../controllers/Customer-controller.js";
import { getReport, listPayments } from "../controllers/Report-controller.js";
import { listSubscribers, updateSubscriber, deleteSubscriber } from "../controllers/Subscriber-controller.js";
import { listSales, createSale, updateSale, deleteSale, listSaleSignups, sendSaleEmails } from "../controllers/Sale-controller.js";
import multer from "multer";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../services/storage.js";
import { listTemplates, updateTemplate, resetTemplate, previewTemplate, sendTestEmail, emailStatus, listEmailLogs } from "../controllers/Email-controller.js";

const adminRouter = express.Router();

// Banner images are kept in memory and handed to the storage service (Supabase or local disk).
const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES[file.mimetype]) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});

// Auth
adminRouter.post("/login", loginLimiter, adminLogin);
adminRouter.post("/logout", requireAdmin, adminLogout);
adminRouter.get("/demo", demoStatus);
adminRouter.post("/demo-login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, message: "Too many demo sign-ins. Try again shortly." } }), demoLogin);
adminRouter.get("/me", requireAdmin, getMe);
adminRouter.post("/change-password", requireAdmin, changePassword);

// Settings & Delivery
adminRouter.get("/settings", requireAdmin, getAdminSettings);
adminRouter.put("/settings", requireAdmin, updateAdminSettings);

// Dashboard
adminRouter.get("/dashboard", adminCan("dashboard.view"), getDashboard);
adminRouter.get("/system-status", requireAdmin, getSystemStatus);

// Admin users
adminRouter.get("/users", adminCan("admins.view"), listAdmins);
adminRouter.post("/users", adminCan("admins.manage"), createAdmin);
adminRouter.put("/users/:id", adminCan("admins.manage"), updateAdmin);

// Roles & permissions
adminRouter.get("/permissions", adminCan("roles.view"), listPermissions);
adminRouter.get("/roles", adminCan("roles.view"), listRoles);
adminRouter.post("/roles", adminCan("roles.manage"), createRole);
adminRouter.put("/roles/:id", adminCan("roles.manage"), updateRole);
adminRouter.delete("/roles/:id", adminCan("roles.manage"), deleteRole);

// Audit
adminRouter.get("/audit-logs", adminCan("audit.view"), listAuditLogs);

// Coupons
adminRouter.get("/coupons", adminCan("coupons.view"), listCoupons);
adminRouter.post("/coupons", adminCan("coupons.manage"), createCoupon);
adminRouter.put("/coupons/:id", adminCan("coupons.manage"), updateCoupon);
adminRouter.delete("/coupons/:id", adminCan("coupons.manage"), deleteCoupon);
adminRouter.get("/coupons/:id/usages", adminCan("coupons.view"), couponUsages);
adminRouter.post("/coupons/:id/send", adminCan("coupons.manage", "notifications.manage"), sendCouponCampaign);

// Catalog: categories (listing first adds any category a dish uses but that has no record yet)
adminRouter.get("/categories", adminCan("products.view"), async (req, res, next) => { await syncCategories(); next(); }, listCategories);
adminRouter.post("/categories", adminCan("products.create"), bannerUpload.any(), createCategory);
adminRouter.put("/categories/reorder", adminCan("products.update"), reorderCategories);
adminRouter.put("/categories/:id", adminCan("products.update"), bannerUpload.any(), updateCategory);
adminRouter.delete("/categories/:id", adminCan("products.delete"), deleteCategory);

// Customers & newsletter
adminRouter.get("/customers", adminCan("customers.view"), listCustomers);
adminRouter.get("/customers/:id", adminCan("customers.view"), getCustomer);
adminRouter.get("/subscribers", adminCan("customers.view"), listSubscribers);
adminRouter.put("/subscribers/:id", adminCan("notifications.manage"), updateSubscriber);
adminRouter.delete("/subscribers/:id", adminCan("notifications.manage"), deleteSubscriber);

// Money
adminRouter.get("/payments", adminCan("payments.view"), listPayments);
adminRouter.get("/reports", adminCan("reports.view"), getReport);

// Festival sales
adminRouter.get("/sales", adminCan("coupons.view"), listSales);
adminRouter.post("/sales", adminCan("coupons.manage"), createSale);
adminRouter.put("/sales/:id", adminCan("coupons.manage"), updateSale);
adminRouter.delete("/sales/:id", adminCan("coupons.manage"), deleteSale);
adminRouter.get("/sales/:id/signups", adminCan("coupons.view"), listSaleSignups);
adminRouter.post("/sales/:id/send", adminCan("coupons.manage", "notifications.manage"), sendSaleEmails);

// Home banners (content)
adminRouter.get("/banners", adminCan("content.view"), listBanners);
adminRouter.post("/banners", adminCan("content.manage"), bannerUpload.any(), createBanner);
adminRouter.put("/banners/reorder", adminCan("content.manage"), reorderBanners);
adminRouter.put("/banners/:id", adminCan("content.manage"), bannerUpload.any(), updateBanner);
adminRouter.delete("/banners/:id", adminCan("content.manage"), deleteBanner);

// Email templates & log
adminRouter.get("/email-templates", adminCan("notifications.view"), listTemplates);
adminRouter.post("/email-templates/preview", adminCan("notifications.view"), previewTemplate);
adminRouter.post("/email-templates/test", adminCan("notifications.manage"), sendTestEmail);
adminRouter.put("/email-templates/:key", adminCan("notifications.manage"), updateTemplate);
adminRouter.post("/email-templates/:key/reset", adminCan("notifications.manage"), resetTemplate);
adminRouter.get("/email-status", adminCan("notifications.view"), emailStatus);
adminRouter.get("/email-logs", adminCan("notifications.view"), listEmailLogs);

export default adminRouter;
