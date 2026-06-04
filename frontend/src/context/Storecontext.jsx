import React from "react";

import { createContext, useState } from "react";
import { useEffect } from "react";
import axios from "axios";
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const url = "https://arsha-food-web.onrender.com"
  const [token, setToken] = useState("")
  const [food_list, setFood_list] = useState([])




  const addToCart = async (itemId) => {

    if (!cartItems[itemId]) {
      setCartItems((prev) => ({
        ...prev,
        [itemId]: 1,
      }));
    } else {
      setCartItems((prev) => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1,
      }));
    }


    if (token) {
      await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } })
    }
  }


  const removeItemFromCart = async (itemId) => {
    setCartItems((prev) => ({
      ...prev, [itemId]: prev[itemId] - 1
    }));

    if (token) {
      axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } })
    }
  }

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

  const fetch_foodlist = async () => {
    const response = await axios.get(url + "/api/food/list")
    setFood_list(response.data.data)
  }


  const localCartData = async (token) => {
    const response = await axios.post(url + "/api/cart/get", {}, { headers: { token } })
    setCartItems(response.data.cart_data || {});
  }

  useEffect(() => {

    async function load_data() {
      fetch_foodlist()
      if (localStorage.getItem("token")) {
        setToken(localStorage.getItem("token"));
        await localCartData(localStorage.getItem("token"));
      }
    }
    load_data();
  }, [])

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeItemFromCart,
    get_total_Cart_amount,
    url,
    token,
    setToken
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
