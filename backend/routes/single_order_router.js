import express from "express";
import { Place_single_order } from "../controllers/Single-order-controller.js";
import authMiddlewear from "../middlewear/auth.js";


const Place_buy_order = express.Router();

Place_buy_order.post("/get_single_order", authMiddlewear, Place_single_order)

export default Place_buy_order;
