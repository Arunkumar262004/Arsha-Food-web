import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },   // e.g. "order_confirmed"
    name: { type: String, required: true },
    description: { type: String, default: "" },             // when it is sent
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, default: "" },                    // plain-text fallback
    variables: { type: [String], default: [] },             // {{placeholders}} available
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", emailTemplateSchema);
export default EmailTemplate;
