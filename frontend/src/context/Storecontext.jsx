import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { API_CONFIG } from "../config/api.config";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const url = API_CONFIG.BASE_URL;
  const [settings, setSettings] = useState({ deliveryFee: 40, freeDeliveryThreshold: 499, currencySymbol: "₹", currency: "INR" });
  const [token, setToken] = useState("");
  const [food_list, setFood_list] = useState([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [publicCoupons, setPublicCoupons] = useState([]);

  const imageSrc = (image) => (/^https?:\/\//.test(image || "") ? image : url + "/images/" + image);

  const addToCart = async (itemId) => {
    if (!token) {
      setShowLogin(true);
      return false;
    }
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

  const fetch_foodlist = async () => {
    try {
      const response = await axios.get(url + "/api/food/list");
      setFood_list(response.data.data || []);
    } finally {
      setFoodLoading(false);
    }
  };

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

  const localCartData = async (token) => {
    const response = await axios.post(url + "/api/cart/get", {}, { headers: { token } });
    setCartItems(response.data.cart_data || {});
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setCartItems({});
    setCoupon(null);
  };

  useEffect(() => {
    async function load_data() {
      fetch_foodlist();
      fetch_coupons();
      axios.get(url + "/api/settings/public")
        .then(r => r.data.success && setSettings(s => ({ ...s, ...r.data.data })))
        .catch(() => {});
      if (localStorage.getItem("token")) {
        setToken(localStorage.getItem("token"));
        await localCartData(localStorage.getItem("token")).catch(() => {});
      }
    }
    load_data();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue = {
    food_list,
    foodLoading,
    cartItems,
    setCartItems,
    addToCart,
    removeItemFromCart,
    clearItem,
    cartCount,
    get_total_Cart_amount,
    coupon,
    setCoupon,
    publicCoupons,
    url,
    imageSrc,
    settings,
    token,
    setToken,
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
