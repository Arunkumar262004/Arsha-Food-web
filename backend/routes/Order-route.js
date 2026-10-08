import express from 'express';
import authMiddlewear from '../middlewear/auth.js';
import { adminCan } from '../middlewear/adminAuth.js';
import { PlaceOrder, previewCoupon, usersOrder, verifyOrder, paymentFailed, listOrders, UpdateStatus } from '../controllers/Order-controller.js';


const orderRouter = express.Router();


orderRouter.post("/place",authMiddlewear,PlaceOrder);
orderRouter.post("/coupon",authMiddlewear,previewCoupon);
orderRouter.post("/verify",authMiddlewear,verifyOrder);
orderRouter.post("/payment-failed",authMiddlewear,paymentFailed);
orderRouter.post("/userorders",authMiddlewear,usersOrder);
orderRouter.get("/list",adminCan("orders.view"),listOrders);
orderRouter.post("/status",adminCan("orders.update"),UpdateStatus);
// POST /api/order/razorpay/webhook is mounted in server.js (needs the raw body)




export default orderRouter;
