# Environment Configuration Guide

## Overview
Both frontend and admin panels use a centralized API configuration system. You only need to set the **VITE_API_URL** environment variable to change the backend URL across the entire application.

## Files to Configure

### 1. Backend (`.env`)
See `backend/.env.example` for every key (MongoDB, JWT, Razorpay, Supabase Storage, first admin).
Never put real values in this file; it is committed to git.

### 2. Frontend (`.env`)
```env
# Set your backend API URL here
VITE_API_URL=https://arsha-food-web.onrender.com
```

### 3. Admin (`.env`)
```env
# Set your backend API URL here
VITE_API_URL=https://arsha-food-web.onrender.com
```

## Deployment URLs

### Local Development
```env
VITE_API_URL=https://arsha-food-web.onrender.com
```

### Render/Production
```env
# Replace with your actual Render backend URL
VITE_API_URL=https://your-backend-name.onrender.com
```

### Other Hosting (Vercel, Railway, etc.)
```env
# Replace with your backend URL
VITE_API_URL=https://your-backend-domain.com
```

## How It Works

The configuration is centralized in:
- `frontend/src/config/api.config.js`
- `admin/src/config/api.config.js`

Both files have the same structure and read from `VITE_API_URL` environment variable:

```javascript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "https://arsha-food-web.onrender.com",
  ENDPOINTS: {
    FOOD_ADD: "/api/food/add",
    USER_LOGIN: "/api/user/login",
    // ... other endpoints
  }
};
```

## Usage in Components

### In Frontend Context (Storecontext.jsx)
```javascript
import { API_CONFIG } from "../config/api.config";

const url = API_CONFIG.BASE_URL;
```

### In Admin App
```javascript
import { API_CONFIG } from './config/api.config';

const url = API_CONFIG.BASE_URL;
```

### In any component
```javascript
import { getApiUrl, API_CONFIG } from "../config/api.config";

// Using the function
const endpoint = getApiUrl(API_CONFIG.ENDPOINTS.USER_LOGIN);

// Or directly with BASE_URL
const url = `${API_CONFIG.BASE_URL}/api/food/list`;
```

## Deployment Checklist

- [ ] Update `backend/.env` with Render backend URL
- [ ] Update `frontend/.env` with backend URL
- [ ] Update `admin/.env` with backend URL
- [ ] Verify `VITE_API_URL` is set correctly before deploying
- [ ] Test API calls after deployment

## Notes

- Always use `https://` for production URLs
- Environment variables must be set before build time
- The `.env.example` files show template configurations
- Never commit `.env` files with sensitive data to git
