// Storage abstraction: business code calls upload()/remove() and never knows which provider is used.
// Supabase Storage is used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set; otherwise local disk.
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const LOCAL_DIR = "uploads";

let supabase = null;
let bucketChecked = false;

const bucketName = () => process.env.SUPABASE_BUCKET || "food-images";

export const activeProvider = () =>
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";

const getSupabase = () => {
    if (!supabase) {
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
    }
    return supabase;
};

// Create the public bucket on first use if it does not exist yet.
const ensureBucket = async () => {
    if (bucketChecked) return;
    const client = getSupabase();
    const { data } = await client.storage.getBucket(bucketName());
    if (!data) {
        const { error } = await client.storage.createBucket(bucketName(), {
            public: true,
            fileSizeLimit: MAX_IMAGE_BYTES,
            allowedMimeTypes: Object.keys(ALLOWED_IMAGE_TYPES),
        });
        if (error && !/already exists/i.test(error.message)) throw new Error(`Supabase bucket: ${error.message}`);
    }
    bucketChecked = true;
};

/**
 * Upload a file buffer. Returns { provider, key, url } where `url` is what gets stored on the record
 * (full URL for Supabase, bare filename for local so existing `/images/<name>` URLs keep working).
 */
export const upload = async ({ buffer, mimetype }, folder = "foods") => {
    const ext = ALLOWED_IMAGE_TYPES[mimetype];
    if (!ext) throw new Error("Unsupported image type");
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

    if (activeProvider() === "supabase") {
        await ensureBucket();
        const key = `${folder}/${name}`;
        const client = getSupabase();
        const { error } = await client.storage.from(bucketName()).upload(key, buffer, {
            contentType: mimetype,
            cacheControl: "31536000",
            upsert: false,
        });
        if (error) throw new Error(`Supabase upload failed: ${error.message}`);
        const { data } = client.storage.from(bucketName()).getPublicUrl(key);
        return { provider: "supabase", key, url: data.publicUrl };
    }

    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, name), buffer);
    return { provider: "local", key: name, url: name };
};

export const remove = async ({ provider, key }) => {
    if (!key) return;
    try {
        if (provider === "supabase") {
            await getSupabase().storage.from(bucketName()).remove([key]);
        } else {
            await fs.unlink(path.join(LOCAL_DIR, path.basename(key)));
        }
    } catch (err) {
        console.warn("Storage remove failed:", err.message);
    }
};
