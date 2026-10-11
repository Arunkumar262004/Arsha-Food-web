import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { API_CONFIG } from "../config/api.config";
import { setCategoryOrder } from "../config/menuOrder";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const url = API_CONFIG.BASE_URL;
  const [settings, setSettings] = useState({ deliveryFee: 40, freeDeliveryThreshold: 499, currencySymbol: "₹", currency: "INR" });
  // Read synchronously so guarded pages (checkout) don't treat a signed-in user as logged out on first render.
  const [token, setToken] = useState(() => { try { return localStorage.getItem("token") || ""; } catch { return ""; } });
  const [user, setUser] = useState(null);
  const [allFoods, setFood_list] = useState([]);
  // Categories managed in admin → Categories (null until loaded, or if the backend doesn't have them yet).
  const [categories, setCategories] = useState(null);
  const [foodLoading, setFoodLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  // True once the saved cart has been fetched (or there is no session), so pages can tell "empty" from "not loaded yet".
  const [cartLoaded, setCartLoaded] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [publicCoupons, setPublicCoupons] = useState([]);

  // Dishes in categories the admin has hidden don't appear anywhere on the storefront.
  const food_list = React.useMemo(() => {
    if (!categories?.length) return allFoods;
    const visible = new Set(categories.map((c) => c.name));
    return allFoods.filter((f) => visible.has(f.category));
  }, [allFoods, categories]);

  // Optional width asks image CDNs that support it (Unsplash) for a right-sized file instead of the original.
  const imageSrc = (image, width) => {
    if (!/^https?:\/\//.test(image || "")) return url + "/images/" + image;
    if (!width || !image.includes("images.unsplash.com")) return image;
    const u = new URL(image);
    u.searchParams.set("w", String(width));
    return u.toString();
  };

  const addToCart = async (itemId) => {
    if (!token) {
      setShowLogin(true);
      return false;
    }
    if (food_list.find((f) => f._id === itemId)?.isAvailable === false) return false;
    setCartItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
    return true;
  };

  const removeItemFromCart = async (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) - 1) }));
    if (token) {
      axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } });
    }
  };

  const clearItem = async (itemId) => {
    const n = cartItems[itemId] || 0;
    setCartItems((prev) => ({ ...prev, [itemId]: 0 }));
    if (token) {
      for (let i = 0; i < n; i++) await axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } });
    }
  };

  const get_total_Cart_amount = () => {
    let total_amount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let iteminfo = food_list.find((product) => product._id === item);
        if (iteminfo) {
          total_amount += iteminfo.price * cartItems[item];
        }
      }
    }
    return total_amount;
  };

  const cartCount = Object.entries(cartItems)
    .filter(([id, n]) => n > 0 && food_list.some((f) => f._id === id))
    .reduce((s, [, n]) => s + n, 0);

  useEffect(() => { setCoupon(null) }, [cartItems]);

  // pricing=live → dishes in a running festival sale come back with the sale price (and the regular price as `mrp`).
  const fetch_foodlist = async () => {
    try {
      const response = await axios.get(url + "/api/food/list?pricing=live");
      setFood_list(response.data.data || []);
    } finally {
      setFoodLoading(false);
    }
  };

  // Live and upcoming festival sales (admin → Festival Sales).
  const [sales, setSales] = useState([]);
  const fetch_sales = () => axios.get(url + "/api/sales").then((r) => r.data.success && setSales(r.data.data)).catch(() => {});
  // Prices change when a sale starts or ends: refresh menu and sales together.
  const refreshPricing = () => { fetch_foodlist(); fetch_sales(); };

  const fetch_coupons = async () => {
    try {
      const res = await axios.get(url + "/api/user/coupons");
      if (res.data.success) {
        setPublicCoupons(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading public coupons", err);
    }
  };

  const fetchUserProfile = async (authToken) => {
    const t = authToken || token;
    if (!t) return;
    try {
      const res = await axios.get(url + "/api/user/profile", { headers: { token: t } });
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error("Error fetching user profile", err);
    }
  };

  const localCartData = async (authToken) => {
    const response = await axios.post(url + "/api/cart/get", {}, { headers: { token: authToken } });
    setCartItems(response.data.cart_data || {});
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setCartItems({});
    setCoupon(null);
  };

  useEffect(() => {
    async function load_data() {
      fetch_foodlist();
      fetch_sales();
      axios.get(url + "/api/categories")
        .then((r) => { if (r.data.success) { setCategoryOrder(r.data.data.map((c) => c.name)); setCategories(r.data.data); } })
        .catch(() => {});
      fetch_coupons();
      axios.get(url + "/api/settings/public")
        .then(r => r.data.success && setSettings(s => ({ ...s, ...r.data.data })))
        .catch(() => {});
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        await localCartData(storedToken).catch(() => {});
        setCartLoaded(true);
        await fetchUserProfile(storedToken).catch(() => {});
      } else {
        setCartLoaded(true);
      }
    }
    load_data();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    }
  }, [token]);

  // Keep prices current for long-open tabs (a sale may start or end while browsing).
  useEffect(() => {
    const id = setInterval(refreshPricing, 5 * 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && refreshPricing();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = {
    sales,
    refreshPricing,
    food_list,
    categories,
    foodLoading,
    cartItems,
    setCartItems,
    addToCart,
    removeItemFromCart,
    clearItem,
    cartCount,
    cartLoaded,
    get_total_Cart_amount,
    coupon,
    setCoupon,
    publicCoupons,
    url,
    imageSrc,
    settings,
    token,
    setToken,
    user,
    setUser,
    fetchUserProfile,
    logout,
    showLogin,
    setShowLogin,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
