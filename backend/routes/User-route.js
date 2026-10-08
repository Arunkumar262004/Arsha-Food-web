import express from "express";
import { loginuser, registeruser, mobilelogin, sendotp } from "../controllers/USer-controller.js";
import { listPublicCoupons } from "../controllers/Coupon-controller.js";

const user_router = express.Router();

user_router.post("/login", loginuser);
user_router.post("/register", registeruser);
user_router.post("/mobile-login", mobilelogin);
user_router.post("/send-otp", sendotp);
user_router.get("/coupons", listPublicCoupons);

export default user_router;