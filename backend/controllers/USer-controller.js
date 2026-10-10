import userModel from "../models/User-model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import { notifyWelcome } from "../services/notify.js";
import { upload as uploadImage } from "../services/storage.js";

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
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            address: user.address,
        };
        res.json({ success: true, token, user: userData });
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
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            address: user.address,
        };
        res.json({ success: true, token, user: userData });
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
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                avatar: user.avatar,
                address: user.address,
            }
        });
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

// Get User Profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const user = await userModel.findById(userId).select("-password");
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.json({ success: false, message: "Error fetching profile" });
    }
};

// Update User Profile (Name, Phone, Email, Address, Avatar)
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const { name, phone, email } = req.body;

        let address = req.body.address;
        if (typeof address === "string") {
            try { address = JSON.parse(address); } catch (e) { address = {}; }
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (name && name.trim()) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (email && validator.isEmail(email)) user.email = email.trim();

        if (address && typeof address === "object") {
            user.address = {
                firstName: address.firstName || user.address?.firstName || "",
                lastName: address.lastName || user.address?.lastName || "",
                email: address.email || user.address?.email || "",
                phone: address.phone || user.address?.phone || "",
                street: address.street || user.address?.street || "",
                city: address.city || user.address?.city || "",
                state: address.state || user.address?.state || "",
                zipcode: address.zipcode || user.address?.zipcode || "",
                country: address.country || user.address?.country || "India",
            };
        }

        if (req.file || (req.files && req.files.length > 0)) {
            const avatarFile = req.file || req.files[0];
            const uploaded = await uploadImage(avatarFile, "avatars");
            user.avatar = uploaded.url;
        }

        await user.save();
        const userObj = user.toObject();
        delete userObj.password;
        res.json({ success: true, message: "Profile updated successfully", user: userObj });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.json({ success: false, message: error.message || "Error updating profile" });
    }
};

// Change User Password
const changeUserPassword = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.json({ success: false, message: "Please provide old and new password" });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: "New password must be at least 6 characters" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        res.json({ success: false, message: "Error changing password" });
    }
};

export { loginuser, registeruser, mobilelogin, sendotp, getUserProfile, updateUserProfile, changeUserPassword };