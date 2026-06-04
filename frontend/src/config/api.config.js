/**
 * Central configuration for API endpoints
 * Change VITE_API_URL in .env to update the backend URL across the app
 */

export const API_CONFIG = {
  // Backend API URL - set via environment variables
  BASE_URL: import.meta.env.VITE_API_URL || "https://arsha-food-web.onrender.com",
  
  // API Endpoints
  ENDPOINTS: {
    // Food
    FOOD_ADD: "/api/food/add",
    FOOD_LIST: "/api/food/list",
    FOOD_REMOVE: "/api/food/remove",
    FOOD_GET: "/api/food/getid",
    
    // User
    USER_LOGIN: "/api/user/login",
    USER_REGISTER: "/api/user/register",
    
    // Cart
    CART_ADD: "/api/cart/add",
    CART_REMOVE: "/api/cart/remove",
    CART_GET: "/api/cart/get",
    
    // Orders
    ORDER_PLACE: "/api/order/place",
    ORDER_VERIFY: "/api/order/verify",
    ORDER_USER: "/api/order/userorders",
    ORDER_LIST: "/api/order/list",
    ORDER_STATUS: "/api/order/status",
    
    // Single Order
    SINGLE_ORDER: "/api/placesingle/get_single_order",
    
    // Admin
    ADMIN_LOGIN: "/api/admin/login",
    ADMIN_SEED: "/api/admin/seed",
    
    // Images
    IMAGES: "/images"
  }
};

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
