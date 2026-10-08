import nodemailer from "nodemailer";

let transport = null;

export const isMailConfigured = () =>
    !!(process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD && process.env.MAIL_FROM_ADDRESS);

const getTransport = () => {
    if (!transport) {
        const port = Number(process.env.MAIL_PORT) || 587;
        transport = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port,
            secure: port === 465,
            auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
        });
    }
    return transport;
};

export const fromAddress = () => {
    const addr = String(process.env.MAIL_FROM_ADDRESS || "").replace(/^"|"$/g, "");
    const name = process.env.MAIL_FROM_NAME || "Inofex Restaurant";
    return `"${name}" <${addr}>`;
};

export const verifyMail = async () => {
    if (!isMailConfigured()) return { ok: false, message: "SMTP is not configured" };
    try {
        await getTransport().verify();
        return { ok: true, message: "Connected to " + process.env.MAIL_HOST };
    } catch (err) {
        return { ok: false, message: err.message };
    }
};

export const sendMail = async ({ to, subject, html, text }) => {
    if (!isMailConfigured()) throw new Error("SMTP is not configured");
    const info = await getTransport().sendMail({ from: fromAddress(), to, subject, html, text: text || undefined });
    return info.messageId;
};
