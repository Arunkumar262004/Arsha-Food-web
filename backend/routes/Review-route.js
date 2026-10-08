import express from "express";
import authMiddlewear from "../middlewear/auth.js";
import { adminCan } from "../middlewear/adminAuth.js";
import {
  submitReview,
  getProductReviews,
  checkPurchaseStatus,
  getAdminReviews,
  updateReviewStatus,
  deleteReview,
} from "../controllers/Review-controller.js";

const reviewRouter = express.Router();

// Public routes
reviewRouter.get("/product/:productId", getProductReviews);

// Customer routes (Protected by user auth)
reviewRouter.post("/add", authMiddlewear, submitReview);
reviewRouter.get("/check-purchase/:productId", authMiddlewear, checkPurchaseStatus);

// Admin moderation routes
reviewRouter.get("/admin/list", adminCan("products.view"), getAdminReviews);
reviewRouter.put("/admin/:id/status", adminCan("products.update"), updateReviewStatus);
reviewRouter.delete("/admin/:id", adminCan("products.delete"), deleteReview);

export default reviewRouter;
