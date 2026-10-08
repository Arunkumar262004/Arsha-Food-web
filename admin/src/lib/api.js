import axios from "axios";
import { API_CONFIG } from "../config/api.config";

export const API_URL = API_CONFIG.BASE_URL;

const TOKEN_KEY = "adminToken";

// "Remember me" keeps the token in localStorage; otherwise it lives for the browser session only.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  set: (token, remember) => {
    tokenStore.clear();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },
  // Replace the token wherever it is currently stored (e.g. after a password change).
  replace: (token) => {
    if (localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.setItem(TOKEN_KEY, token);
  },
  clear: () => { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); },
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Any 401 means the session is gone: notify the auth context so it can log out.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.endsWith("/api/admin/login")) {
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export const errMsg = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || fallback;

// Food images are full URLs (Supabase Storage) for new items, bare filenames for older uploads.
export const imageSrc = (image) =>
  /^https?:\/\//.test(image || "") ? image : `${API_URL}/images/${image}`;
