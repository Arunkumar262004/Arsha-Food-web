import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },          // "razorpay"
  eventId: { type: String, required: true },           // provider's unique event id (idempotency key)
  event: { type: String },                             // e.g. "payment.captured"
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received" },
  result: { type: String },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
export default WebhookEvent;
