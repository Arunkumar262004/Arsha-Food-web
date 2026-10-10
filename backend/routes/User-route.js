import express from "express";
import multer from "multer";
import { loginuser, registeruser, mobilelogin, sendotp, getUserProfile, updateUserProfile, changeUserPassword } from "../controllers/USer-controller.js";
import { listPublicCoupons } from "../controllers/Coupon-controller.js";
import authMiddlewear from "../middlewear/auth.js";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "../services/storage.js";

const user_router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES[file.mimetype]) return cb(null, true);
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    },
});

user_router.post("/login", loginuser);
user_router.post("/register", registeruser);
user_router.post("/mobile-login", mobilelogin);
user_router.post("/send-otp", sendotp);
user_router.get("/coupons", listPublicCoupons);

// Profile management
user_router.get("/profile", authMiddlewear, getUserProfile);
user_router.post("/profile", authMiddlewear, upload.single("avatar"), updateUserProfile);
user_router.post("/change-password", authMiddlewear, changeUserPassword);

export default user_router;