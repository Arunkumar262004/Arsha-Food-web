import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import multer from "multer"
import { connectdb } from "./config/db.js";
import foodRouter from "./routes/foodRouter.js"
import user_router from "./routes/User-route.js";
import cart_router from "./routes/cart-Route.js";
import orderRouter from "./routes/Order-route.js";
import place_buy_order from "./routes/single_order_router.js";
import adminRouter from "./routes/Adminrouter.js";
import reviewRouter from "./routes/Review-route.js";
import { razorpayWebhook } from "./controllers/Order-controller.js";
import { getSettings, PUBLIC_SETTING_KEYS } from "./models/Settingmodel.js";
import { bootstrap } from "./services/bootstrap.js";
import { listPublicBanners } from "./controllers/Banner-controller.js";

// app config
const app = express();
const port = process.env.PORT || 5000;

app.set("trust proxy", 1);

// middlewears
// Images are loaded cross-origin by the storefront and admin apps.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(cors())
// Webhook signature is computed over the raw body, so it must be mounted before express.json().
app.post("/api/order/razorpay/webhook", express.raw({ type: "application/json", limit: "1mb" }), razorpayWebhook);
app.use(express.json({ limit: "1mb" }))

// db connection
connectdb().then(() => bootstrap()).catch(err => console.error("Bootstrap error:", err.message));

// api enddpoints
app.use("/api/food",foodRouter);
app.use("/images",express.static('uploads'));
app.use("/api/user",user_router);
app.use("/api/admin", adminRouter);
app.use("/api/cart",cart_router);
app.use("/api/order",orderRouter)
app.use("/api/placesingle/",place_buy_order)
app.use("/api/reviews", reviewRouter);
app.get("/api/banners", listPublicBanners);
app.get("/api/settings/public", async (req, res) => {
    res.json({ success: true, data: await getSettings(PUBLIC_SETTING_KEYS) });
});
app.get("/",(req,res)=>{
    res.send("API Working")
})

// Centralised error handler (Express 5 forwards async errors here)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller"
            : err.code === "LIMIT_UNEXPECTED_FILE" ? "Only JPG, PNG, WEBP or GIF images are allowed"
            : err.message;
        return res.status(400).json({ success: false, message });
    }
    console.error(`${req.method} ${req.originalUrl}:`, err.message);
    res.status(err.status || 500).json({ success: false, message: "Server error" });
});


app.listen(port, "0.0.0.0", () => {
    console.log(`Server Started on port ${port}`);
})
