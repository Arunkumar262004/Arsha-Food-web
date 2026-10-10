import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { payWithRazorpay } from '../../utils/razorpay';
import { VegMark } from '../../component/Fooditem/Fooditem';
import { AddressForm, CheckoutSteps, CouponBox, PriceSummary, useAddress, useTotals } from '../../component/Checkout/Checkout';
import Icon from '../../component/Icon';
import './Placeorder.css';

const Placeorder = () => {
  const { get_total_Cart_amount, token, cartItems, cartLoaded, setCartItems, url, food_list, settings, setShowLogin, coupon, setCoupon, imageSrc, cartCount } = useContext(StoreContext);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const { data, onChange, prefilled } = useAddress();
  const navigate = useNavigate();
  const cur = settings.currencySymbol;

  const totals = useTotals(get_total_Cart_amount());
  const lines = food_list.filter((f) => cartItems[f._id] > 0);
  const couponItems = lines.map((f) => ({ id: f._id, quantity: cartItems[f._id] }));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = 'Checkout — Arsha';
    if (!token) {
      setShowLogin(true);
      navigate('/cart');
    } else if (cartLoaded && food_list.length && get_total_Cart_amount() === 0) {
      navigate('/cart');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cartLoaded, food_list.length]);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!token) { setShowLogin(true); return; }
    setPaying(true); setError('');
    try {
      const orderItems = lines.map((f) => ({ _id: f._id, quantity: cartItems[f._id] }));
      const response = await axios.post(`${url}/api/order/place`, { address: data, items: orderItems, couponCode: coupon?.code }, { headers: { token } });
      if (!response.data.success) { setError(response.data.message || 'Could not place your order.'); return; }
      const result = await payWithRazorpay({ url, token, checkout: response.data });
      if (result === 'paid') {
        setCartItems({});
        setCoupon(null);
        navigate('/myorders');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not place your order.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="container co-page">
      <div className="co-title-row">
        <div>
          <h1 className="co-title">Checkout</h1>
          <p>Almost there — confirm where to deliver and pay securely.</p>
        </div>
        <CheckoutSteps step={1} />
      </div>

      <form onSubmit={placeOrder} className="co-layout">
        <div className="co-main">
          <AddressForm data={data} onChange={onChange} prefilled={prefilled} />
          <div className="co-card po-eta">
            <span className="co-icon"><Icon name="clock" size={20} /></span>
            <div>
              <strong>Delivery in 25–35 minutes</strong>
              <span>Your food is cooked after you pay, then packed in sealed containers.</span>
            </div>
          </div>
        </div>

        <aside className="co-side">
          <div className="co-card">
            <div className="po-items-head">
              <h2 className="co-bill-title">Your order</h2>
              <Link to="/cart" className="co-edit"><Icon name="arrowLeft" size={15} />Edit cart</Link>
            </div>
            <div className="co-items">
              {lines.map((f) => (
                <div key={f._id} className="co-item">
                  <img src={imageSrc(f.image, 140)} alt="" />
                  <div>
                    <div className="co-item-name"><VegMark isVeg={f.isVeg !== false} size={13} />{f.name}</div>
                    <small>{cartItems[f._id]} × {cur}{f.price}</small>
                  </div>
                  <span className="co-item-price">{cur}{f.price * cartItems[f._id]}</span>
                </div>
              ))}
            </div>
          </div>

          <CouponBox items={couponItems} subtotal={totals.subtotal} />

          <PriceSummary totals={totals} itemCount={cartCount}>
            {error && <div className="co-error" role="alert" style={{ marginTop: 14 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-block co-pay" disabled={paying || !lines.length}>
              {paying ? <span className="spinner" /> : <><span>{cur}{totals.total}</span><span className="po-pay-label">Pay securely<Icon name="lock" size={17} /></span></>}
            </button>
          </PriceSummary>
        </aside>
      </form>
    </div>
  );
};

export default Placeorder;
