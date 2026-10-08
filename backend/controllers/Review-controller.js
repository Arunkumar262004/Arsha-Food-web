import mongoose from "mongoose";
import ReviewModel from "../models/Reviewmodel.js";
import OrderModel from "../models/Order-model.js";
import userModel from "../models/User-model.js";
import FoodModel from "../models/Foodmodel.js";
import { audit } from "../services/audit.js";

// Submit a review (Verified buyers only)
export const submitReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.body.userId;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ success: false, message: "Rating and comment are required." });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5 stars." });
    }

    // Fetch user details
    const user = await userModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Verify if user has purchased this product
    const hasPurchased = await OrderModel.exists({
      userId: userId,
      "items._id": productId,
      paymentStatus: "paid",
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: "Only verified buyers who have purchased this dish can submit a review.",
      });
    }

    // Check if user already submitted a review for this product
    const existing = await ReviewModel.findOne({ userId, productId });
    if (existing) {
      existing.rating = numRating;
      existing.title = title || "";
      existing.comment = comment;
      existing.status = "pending"; // Re-submit for approval upon edit
      await existing.save();
      return res.json({
        success: true,
        message: "Your review has been updated and submitted for admin approval!",
        data: existing,
      });
    }

    const newReview = await ReviewModel.create({
      productId,
      userId,
      userName: user.name || "Food Lover",
      userEmail: user.email,
      rating: numRating,
      title: title || "",
      comment,
      isVerifiedPurchase: true,
      status: "pending",
    });

    res.json({
      success: true,
      message: "Thank you! Your review has been submitted and is pending admin approval.",
      data: newReview,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    res.status(500).json({ success: false, message: "Error submitting review." });
  }
};

// GET /api/reviews/product/:productId (Public - returns only APPROVED reviews)
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await ReviewModel.find({
      productId,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : "5.0";

    res.json({
      success: true,
      data: reviews,
      totalReviews,
      averageRating: Number(avgRating),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching product reviews." });
  }
};

// GET /api/reviews/check-purchase/:productId (Check if logged in user can review)
export const checkPurchaseStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.body.userId;

    if (!userId) {
      return res.json({ success: true, canReview: false, message: "Please log in." });
    }

    const hasPurchased = await OrderModel.exists({
      userId: userId,
      "items._id": productId,
      paymentStatus: "paid",
    });

    const userReview = await ReviewModel.findOne({ userId, productId }).lean();

    res.json({
      success: true,
      canReview: !!hasPurchased,
      userReview: userReview || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error checking purchase status." });
  }
};

// ───────────────────── ADMIN MODERATION CONTROLLERS ─────────────────────

// GET /api/admin/reviews (List all reviews for admin moderation)
export const getAdminReviews = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const reviews = await ReviewModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const productIds = [...new Set(reviews.map((r) => String(r.productId)))].filter(id => mongoose.isValidObjectId(id));
    const foods = await FoodModel.find({ _id: { $in: productIds } }, { name: 1, image: 1, category: 1 }).lean();
    const foodById = Object.fromEntries(foods.map((f) => [String(f._id), f]));

    const populated = reviews.map((r) => ({
      ...r,
      product: foodById[String(r.productId)] || null,
    }));

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching admin reviews." });
  }
};

// PUT /api/admin/reviews/:id/status (Approve / Reject review)
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    review.status = status;
    await review.save();

    audit(req, {
      action: "review.moderate",
      entity: "review",
      entityId: review._id,
      newData: { status },
    });

    res.json({
      success: true,
      message: `Review ${status === "approved" ? "Approved" : "Rejected"} successfully!`,
      data: review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating review status." });
  }
};

// DELETE /api/admin/reviews/:id
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ReviewModel.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    audit(req, {
      action: "review.delete",
      entity: "review",
      entityId: id,
    });

    res.json({ success: true, message: "Review deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting review." });
  }
};
