import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { payWithRazorpay, preloadRazorpay } from '../../utils/razorpay';
import { CartControl, VegMark } from '../../component/Fooditem/Fooditem';
import { AddressForm, CheckoutSteps, CouponBox, PaymentOverlay, PriceSummary, useAddress, useTotals } from '../../component/Checkout/Checkout';
import Icon from '../../component/Icon';
import '../Placeorder/Placeorder.css';
import { dishPath } from '../../config/store';

const Place_single_order = () => {
  const { token, url, settings, setShowLogin, coupon, setCoupon, cartItems, imageSrc } = useContext(StoreContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const cur = settings.currencySymbol;

  const [food, setFood] = useState(null);
  const [paying, setPaying] = useState(false);
  const [opening, setOpening] = useState(false); // our hand-off screen, until Razorpay's window is up
  useEffect(() => { preloadRazorpay(); }, []);
  const [error, setError] = useState('');
  const { data, onChange, prefilled } = useAddress();

  const quantity = Math.max(1, cartItems[id] || 1);
  const totals = useTotals((food?.price || 0) * quantity);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = 'Buy now — Arsha';
    if (!token) { setShowLogin(true); navigate('/'); return; }
    axios.get(`${url}/api/food/getid/${id}?pricing=live`)
      .then((res) => setFood(res.data.dataid))
      .catch((err) => console.error('Error fetching food:', err));
  }, [id, url, token, navigate, setShowLogin]);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!token) { setShowLogin(true); return; }
    setPaying(true); setOpening(true); setError('');
    try {
      const response = await axios.post(`${url}/api/placesingle/get_single_order`,
        { address: data, itemId: food._id, quantity, couponCode: coupon?.code }, { headers: { token } });
      if (!response.data.success) { setError(response.data.message || 'Could not place your order.'); return; }
      const result = await payWithRazorpay({ url, token, checkout: response.data, onOpen: () => setOpening(false) });
      if (result === 'paid') {
        setCoupon(null);
        navigate('/myorders');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not place your order.');
    } finally {
      setPaying(false);
      setOpening(false);
    }
  };

  return (
    <div className="container co-page">
      <div className="co-title-row">
        <div>
          <h1 className="co-title">Buy now</h1>
          <p>Express checkout for a single dish.</p>
        </div>
        <CheckoutSteps step={1} />
      </div>

      <form onSubmit={placeOrder} className="co-layout">
        <div className="co-main">
          <AddressForm data={data} onChange={onChange} prefilled={prefilled} />
          <div className="co-card">
            <div className="po-items-head">
              <h2 className="co-bill-title">Your order</h2>
              {food && <Link to={dishPath(food)} className="co-edit"><Icon name="arrowLeft" size={15} />Back to dish</Link>}
            </div>
            {!food ? (
              <div className="skeleton" style={{ height: 72 }} />
            ) : (
              <div className="co-item pso-item">
                <img src={imageSrc(food.image, 140)} alt="" />
                <div>
                  <div className="co-item-name"><VegMark isVeg={food.isVeg !== false} size={13} />{food.name}</div>
                  <small>{cur}{food.price} each</small>
                </div>
                <CartControl id={food._id} name={food.name} />
              </div>
            )}
          </div>

          <div className="co-card po-eta">
            <span className="co-icon"><Icon name="clock" size={20} /></span>
            <div>
              <strong>Delivery in 25–35 minutes</strong>
              <span>Your food is cooked after you pay, then packed in sealed containers.</span>
            </div>
          </div>
        </div>

        <aside className="co-side">
          {food && <CouponBox items={[{ id: food._id, quantity }]} subtotal={totals.subtotal} />}

          <PriceSummary totals={totals} itemCount={quantity}>
            {error && <div className="co-error" role="alert" style={{ marginTop: 14 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-block co-pay" disabled={paying || !food}>
              {paying ? <span className="spinner" /> : <><span>{cur}{totals.total}</span><span className="po-pay-label">Pay securely<Icon name="lock" size={17} /></span></>}
            </button>
          </PriceSummary>
        </aside>
      </form>
      <PaymentOverlay show={opening} amount={totals.total} />
    </div>
  );
};

export default Place_single_order;
