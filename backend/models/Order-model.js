import mongoose from 'mongoose';

export const ORDER_STATUSES = [
    "Payment Pending",
    "Food Processing",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Payment Failed",
];

const timelineSchema = new mongoose.Schema({
    event: { type: String, required: true },        // "order_created", "payment_success", "status_changed", ...
    from: { type: String },
    to: { type: String },
    note: { type: String },
    by: { type: String },                            // "customer", "system", "webhook", or admin email
    at: { type: Date, default: Date.now },
}, { _id: false });

const Orderschema = new mongoose.Schema({
    orderNumber: { type: String, unique: true, sparse: true },
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    subtotal: { type: Number },
    deliveryFee: { type: Number },
    couponCode: { type: String },
    discount: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    address: { type: Object, required: true },
    status: { type: String, default: "Food Processing" },
    date: { type: Date, default: Date.now },

    // Payment. `payment` is kept for backward compatibility with existing orders/pages.
    payment: { type: Boolean, default: false },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    paymentMethod: { type: String, default: "razorpay" },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
    source: { type: String },                        // "cart" | "single"

    timeline: { type: [timelineSchema], default: [] },
})

Orderschema.index({ date: -1 });
Orderschema.index({ userId: 1, date: -1 });
Orderschema.index({ status: 1 });
Orderschema.index({ payment: 1, date: -1 });
Orderschema.index({ razorpayOrderId: 1 });

// Sequential, human-friendly order numbers (ORD-10001, ORD-10002, ...)
const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export const nextOrderNumber = async () => {
    const c = await Counter.findByIdAndUpdate(
        "order", { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return `ORD-${10000 + c.seq}`;
};

const OrderModel = mongoose.models.Order || mongoose.model("Order", Orderschema);

export default OrderModel;
