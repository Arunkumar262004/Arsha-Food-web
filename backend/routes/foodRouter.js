import express from 'express';
import { addfood, fetch_view_food, listfood, remove_food, update_food } from "../controllers/Foodcontroller.js";
import multer from 'multer';
import { adminCan } from '../middlewear/adminAuth.js';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../services/storage.js';

const foodRouter = express.Router();

// Files are kept in memory and handed to the storage service (Supabase or local disk).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES[file.mimetype]) return cb(null, true);
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    },
});

foodRouter.post("/add", adminCan("products.create"), upload.any(), addfood);
foodRouter.post("/update", adminCan("products.update"), upload.any(), update_food);
foodRouter.get("/list", listfood);
foodRouter.post("/remove", adminCan("products.delete"), remove_food);
foodRouter.get("/getid/:id", fetch_view_food);

export default foodRouter;
