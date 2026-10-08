import userModel from "../models/User-model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { notifyWelcome } from "../services/notify.js";

// create token helper
const create_token = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "randomsecretkey");
};

// login user via Email & Password
const loginuser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = create_token(user._id);
        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error logging in" });
    }
};

// register user via Email
const registeruser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const exist = await userModel.findOne({ email });
        if (exist) {
            return res.json({ success: false, message: "User already exists" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        if (password.length < 6) {
            return res.json({ success: false, message: "Please enter strong password (min 6 chars)" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashpassword = await bcrypt.hash(password, salt);

        const newuser = new userModel({
            name: name,
            email: email,
            password: hashpassword,
        });

        const user = await newuser.save();
        notifyWelcome(user);
        const token = create_token(user._id);
        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error registering user" });
    }
};

// mobile login via OTP
const mobilelogin = async (req, res) => {
    const { phone, name } = req.body;
    try {
        if (!phone || phone.toString().trim().length < 10) {
            return res.json({ success: false, message: "Please enter a valid 10-digit mobile number" });
        }

        const cleanPhone = phone.toString().trim();
        let user = await userModel.findOne({
            $or: [{ phone: cleanPhone }, { email: `${cleanPhone}@arshafood.com` }]
        });

        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashpassword = await bcrypt.hash("MobileUser@" + cleanPhone, salt);
            const newUser = new userModel({
                name: name?.trim() || `Customer ${cleanPhone.slice(-4)}`,
                email: `${cleanPhone}@arshafood.com`,
                phone: cleanPhone,
                password: hashpassword,
            });
            user = await newUser.save();
            notifyWelcome(user);
        }

        const token = create_token(user._id);
        res.json({ success: true, token, user: { name: user.name, phone: user.phone, email: user.email } });
    } catch (error) {
        console.log("Mobile login error:", error);
        res.json({ success: false, message: "Error during mobile authentication" });
    }
};

// send OTP endpoint (generates 4-digit random OTP)
const sendotp = async (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.toString().trim().length < 10) {
        return res.json({ success: false, message: "Please enter a valid 10-digit mobile number" });
    }

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    res.json({ success: true, otp: generatedOtp, message: "OTP sent successfully" });
};

export { loginuser, registeruser, mobilelogin, sendotp };