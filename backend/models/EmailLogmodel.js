import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema({
    template: { type: String },          // template key, or "test"
    to: { type: String, required: true },
    subject: { type: String },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    error: { type: String },
    messageId: { type: String },
    entity: { type: String },            // "order", "user"
    entityId: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

emailLogSchema.index({ createdAt: -1 });

const EmailLog = mongoose.models.EmailLog || mongoose.model("EmailLog", emailLogSchema);
export default EmailLog;
