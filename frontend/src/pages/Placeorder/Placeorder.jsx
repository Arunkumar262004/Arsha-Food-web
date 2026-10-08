import React, { useContext, useEffect, useState } from 'react';
import './Placeorder.css';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { payWithRazorpay } from '../../utils/razorpay';

const Placeorder = () => {
  const { get_total_Cart_amount, token, cartItems, setCartItems, url, food_list, settings, setShowLogin, coupon, setCoupon, publicCoupons } = useContext(StoreContext);
  const [paying, setPaying] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const sym = settings.currencySymbol;
  const navigate = useNavigate();

  const subtotal = get_total_Cart_amount();
  const isFreeDelivery = !!(settings.freeDeliveryThreshold && subtotal >= Number(settings.freeDeliveryThreshold));
  const deliveryFee = subtotal === 0 ? 0 : (coupon?.deliveryFee !== undefined ? coupon.deliveryFee : (isFreeDelivery ? 0 : Number(settings.deliveryFee || 40)));
  const discount = coupon?.discount || 0;
  const grandTotal = Math.max(0, subtotal - discount) + deliveryFee;

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "India",
    phone: ""
  });

  const Onchangehandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data => ({ ...data, [name]: value }));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.title = "Checkout Order — Arsha Food";

    if (!token) {
      setShowLogin(true);
      navigate('/cart');
    } else if (get_total_Cart_amount() === 0) {
      navigate('/cart');
    }
  }, [token, navigate, setShowLogin]);

  const applyCouponCode = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const orderItems = food_list
        .filter((item) => cartItems[item._id] > 0)
        .map((item) => ({ id: item._id, quantity: cartItems[item._id] }));

      const response = await axios.post(
        url + "/api/order/coupon",
        { items: orderItems, code },
        { headers: { token } }
      );

      if (response.data.success) {
        setCoupon({
          code: response.data.code,
          discount: response.data.discount,
          deliveryFee: response.data.deliveryFee,
        });
        setCouponInput('');
        setCouponError('');
      } else {
        setCouponError(response.data.message || 'Invalid coupon code');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Error validating coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponError('');
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!token) {
      setShowLogin(true);
      return;
    }

    const orderItems = food_list
      .filter((item) => cartItems[item._id] > 0)
      .map((item) => ({ _id: item._id, quantity: cartItems[item._id] }));

    setPaying(true);
    try {
      const response = await axios.post(
        url + "/api/order/place",
        { address: data, items: orderItems, couponCode: coupon?.code },
        { headers: { token } }
      );
      if (!response.data.success) {
        alert(response.data.message || "Error in placing order");
        return;
      }
      const result = await payWithRazorpay({ url, token, checkout: response.data });
      if (result === "paid") {
        setCartItems({});
        setCoupon(null);
        navigate('/myorders');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Error in placing order");
    } finally {
      setPaying(false);
    }
  };

  const selectedItems = food_list.filter(item => cartItems[item._id] > 0);

  return (
    <div className="po-wrapper container">
      <form onSubmit={placeOrder} className='po-grid'>
        {/* Left Side: Delivery Details */}
        <div className="po-card po-left">
          <div className="po-head">
            <h2>Delivery Address & Contact</h2>
            <p>Enter where you'd like your delicious meal delivered.</p>
          </div>

          <div className="po-fields">
            <div className="po-row">
              <div className="po-group">
                <label>First Name</label>
                <input required onChange={Onchangehandler} name='firstName' value={data.firstName} type="text" placeholder='First Name' />
              </div>
              <div className="po-group">
                <label>Last Name</label>
                <input required onChange={Onchangehandler} name='lastName' value={data.lastName} type="text" placeholder='Last Name' />
              </div>
            </div>

            <div className="po-group">
              <label>Email Address</label>
              <input required onChange={Onchangehandler} name='email' value={data.email} type="email" placeholder='your.email@example.com' />
            </div>

            <div className="po-group">
              <label>Street Address</label>
              <input required onChange={Onchangehandler} name='street' value={data.street} type="text" placeholder='Flat / House No., Street, Area' />
            </div>

            <div className="po-row">
              <div className="po-group">
                <label>City</label>
                <input required onChange={Onchangehandler} name='city' value={data.city} type="text" placeholder='City' />
              </div>
              <div className="po-group">
                <label>State</label>
                <input required onChange={Onchangehandler} name='state' value={data.state} type="text" placeholder='State' />
              </div>
            </div>

            <div className="po-row">
              <div className="po-group">
                <label>Pincode / Zip</label>
                <input required onChange={Onchangehandler} name='zipcode' value={data.zipcode} type="text" placeholder='Pincode' />
              </div>
              <div className="po-group">
                <label>Country</label>
                <input required onChange={Onchangehandler} name='country' value={data.country} type="text" placeholder='Country' />
              </div>
            </div>

            <div className="po-group">
              <label>Mobile Phone Number</label>
              <input required onChange={Onchangehandler} name='phone' value={data.phone} type='tel' placeholder='10-digit mobile number for order updates' />
            </div>
          </div>
        </div>

        {/* Right Side: Cart Summary & Payment */}
        <div className="po-right">
          <div className="po-card po-summary-box">
            <h2>Order Summary ({selectedItems.length} items)</h2>

            {/* Items Breakdown */}
            <div className="po-items-list">
              {selectedItems.map((item) => (
                <div key={item._id} className="po-item-row">
                  <div className="po-item-name">
                    <span>{item.name}</span>
                    <span className="po-item-qty">× {cartItems[item._id]}</span>
                  </div>
                  <span className="po-item-price">{sym}{item.price * cartItems[item._id]}</span>
                </div>
              ))}
            </div>

            {/* Coupon Application Box */}
            <div className="checkout-coupon-box">
              <div className="checkout-coupon-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f26b1d" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                <span>Apply Coupon</span>
              </div>

              {coupon ? (
                <div className="checkout-applied-tag">
                  <div>
                    🎉 Coupon <strong>{coupon.code}</strong> Applied!
                    {discount > 0 && <span style={{ marginLeft: 6 }}>(-{sym}{discount})</span>}
                  </div>
                  <button type="button" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <>
                  <div className="checkout-coupon-input-group">
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCouponCode(); } }}
                    />
                    <button type="button" onClick={() => applyCouponCode()} disabled={couponLoading || !couponInput.trim()}>
                      {couponLoading ? 'Checking…' : 'Apply'}
                    </button>
                  </div>

                  {couponError && <div className="checkout-coupon-error">{couponError}</div>}

                  {publicCoupons && publicCoupons.length > 0 && (
                    <div className="checkout-available-coupons">
                      <label>Available Offers:</label>
                      <div className="checkout-coupon-chips">
                        {publicCoupons.map((c) => (
                          <button
                            key={c._id || c.code}
                            type="button"
                            className="checkout-coupon-chip"
                            onClick={() => applyCouponCode(c.code)}
                          >
                            🏷️ {c.code} ({c.type === 'percentage' ? `${c.value}% OFF` : c.type === 'fixed' ? `${sym}${c.value} OFF` : 'Free Delivery'})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="po-divider"></div>

            {/* Totals Breakdown */}
            <div className="po-totals">
              <div className="po-total-row">
                <span>Subtotal</span>
                <span>{sym}{subtotal}</span>
              </div>

              {discount > 0 && (
                <div className="po-total-row discount">
                  <span>Coupon Discount ({coupon?.code})</span>
                  <span>-{sym}{discount}</span>
                </div>
              )}

              <div className="po-total-row">
                <span>Delivery Fee</span>
                <span>{deliveryFee === 0 ? <strong style={{ color: '#1f9d61' }}>FREE</strong> : `${sym}${deliveryFee}`}</span>
              </div>

              {isFreeDelivery && (
                <div className="free-delivery-badge">
                  🚚 FREE Delivery unlocked on orders over {sym}{settings.freeDeliveryThreshold}!
                </div>
              )}

              <div className="po-total-row grand-total">
                <span>Grand Total</span>
                <span>{sym}{grandTotal}</span>
              </div>
            </div>

            <button type='submit' className="po-pay-btn" disabled={paying}>
              {paying ? 'PROCESSING PAYMENT…' : 'PROCEED TO PAYMENT'}
            </button>

            <div className="po-secure-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>100% Encrypted & Secure Razorpay Payment</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Placeorder;
