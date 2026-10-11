import mongoose from "mongoose";

// Newsletter sign-ups from the storefront footer.
const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "footer" },
    isActive: { type: Boolean, default: true },   // false once unsubscribed (kept so they aren't re-added by mistake)
}, { timestamps: true });

const Subscriber = mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);
export default Subscriber;
