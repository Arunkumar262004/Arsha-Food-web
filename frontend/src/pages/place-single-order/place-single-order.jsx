import React, { useContext, useEffect, useState } from 'react';
import './place-single-order.css';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { payWithRazorpay } from '../../utils/razorpay';

const Place_single_order = () => {
    const { token, url, settings, setShowLogin, coupon, setCoupon, publicCoupons, cartItems } = useContext(StoreContext);
    const [paying, setPaying] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);

    const sym = settings.currencySymbol;
    const { id } = useParams();
    const navigate = useNavigate();

    const [food, setFoodid] = useState(null);

    const quantity = Math.max(1, cartItems[id] || 1);
    const subtotal = (food?.price || 0) * quantity;
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
        document.title = "Checkout — Arsha Food";

        if (!token) {
            setShowLogin(true);
            navigate('/');
            return;
        }

        const fetch_food_id = async () => {
            try {
                const response = await axios.get(`${url}/api/food/getid/${id}`);
                setFoodid(response.data.dataid);
            } catch (err) {
                console.error("Error fetching food:", err);
            }
        };
        fetch_food_id();
    }, [id, url, token, navigate, setShowLogin]);

    const applyCouponCode = async (codeToApply) => {
        const code = (codeToApply || couponInput).trim().toUpperCase();
        if (!code || !food) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const items = [{ id: food._id, quantity }];
            const response = await axios.post(
                url + "/api/order/coupon",
                { items, code },
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

        setPaying(true);
        try {
            const response = await axios.post(
                url + "/api/placesingle/get_single_order",
                { address: data, itemId: food._id, quantity, couponCode: coupon?.code },
                { headers: { token } }
            );
            if (!response.data.success) {
                alert(response.data.message || "Error in placing order");
                return;
            }
            const result = await payWithRazorpay({ url, token, checkout: response.data });
            if (result === "paid") {
                setCoupon(null);
                navigate('/myorders');
            }
        } catch (err) {
            alert(err.response?.data?.message || err.message || "Error in placing order");
        } finally {
            setPaying(false);
        }
    };

    return (
        <div className="pso-wrapper container">
            <form onSubmit={placeOrder} className='place-order-card'>
                <div className="place-order-left">
                    <h2 className="title">Delivery Address & Details</h2>
                    <p className="subtitle">Please provide your delivery information to complete the order.</p>

                    <div className="multi-fieldds">
                        <div className="field-group">
                            <label>First Name</label>
                            <input required onChange={Onchangehandler} name='firstName' value={data.firstName} type="text" placeholder='First Name' />
                        </div>
                        <div className="field-group">
                            <label>Last Name</label>
                            <input required onChange={Onchangehandler} name='lastName' value={data.lastName} type="text" placeholder='Last Name' />
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Email Address</label>
                        <input required onChange={Onchangehandler} name='email' value={data.email} type="email" placeholder='Email Address' />
                    </div>

                    <div className="field-group">
                        <label>Street Address</label>
                        <input required onChange={Onchangehandler} name='street' value={data.street} type="text" placeholder='House No., Street Name, Area' />
                    </div>

                    <div className="multi-fieldds">
                        <div className="field-group">
                            <label>City</label>
                            <input required onChange={Onchangehandler} name='city' value={data.city} type="text" placeholder='City' />
                        </div>
                        <div className="field-group">
                            <label>State</label>
                            <input required onChange={Onchangehandler} name='state' value={data.state} type="text" placeholder='State' />
                        </div>
                    </div>

                    <div className="multi-fieldds">
                        <div className="field-group">
                            <label>Pincode / Zip</label>
                            <input required onChange={Onchangehandler} name='zipcode' value={data.zipcode} type="text" placeholder='Zipcode' />
                        </div>
                        <div className="field-group">
                            <label>Country</label>
                            <input required onChange={Onchangehandler} name='country' value={data.country} type="text" placeholder='Country' />
                        </div>
                    </div>

                    <div className="field-group">
                        <label>Mobile Phone Number</label>
                        <input required onChange={Onchangehandler} name='phone' value={data.phone} type='tel' placeholder='Phone Number for delivery updates' />
                    </div>
                </div>

                {food ? (
                    <div className="place-order-right">
                        <div className="cart-total-box">
                            <h2>Order Summary</h2>
                            <div className="order-item-preview">
                                <span className="item-name">{food.name} {quantity > 1 && <span style={{ opacity: 0.7, fontWeight: 500 }}>(×{quantity})</span>}</span>
                                <span className="item-price">{sym}{subtotal}</span>
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

                            <div className="cart-summary-rows">
                                <div className="cart-total-details">
                                    <span>Subtotal</span>
                                    <span>{sym}{subtotal}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="cart-total-details" style={{ color: '#1f9d61', fontWeight: 600 }}>
                                        <span>Coupon Discount ({coupon?.code})</span>
                                        <span>-{sym}{discount}</span>
                                    </div>
                                )}
                                <div className="cart-total-details">
                                    <span>Delivery Fee</span>
                                    <span>{deliveryFee === 0 ? <strong style={{ color: '#1f9d61' }}>FREE</strong> : `${sym}${deliveryFee}`}</span>
                                </div>

                                {isFreeDelivery && (
                                    <div className="free-delivery-badge">
                                        🚚 FREE Delivery unlocked on orders over {sym}{settings.freeDeliveryThreshold}!
                                    </div>
                                )}

                                <div className="cart-total-details total-row">
                                    <span>Grand Total</span>
                                    <span>{sym}{grandTotal}</span>
                                </div>
                            </div>

                            <button type='submit' className="pso-pay-btn" disabled={paying}>
                                {paying ? 'PROCESSING PAYMENT…' : 'PROCEED TO PAYMENT'}
                            </button>

                            <div className="pso-secure-badge">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <span>100% Encrypted & Secure Razorpay Payment</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="place-order-right">
                        <div className="skeleton" style={{ height: 320, borderRadius: 20 }}></div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default Place_single_order;
