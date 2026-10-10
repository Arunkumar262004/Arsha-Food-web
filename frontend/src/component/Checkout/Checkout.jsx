import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import Icon from '../Icon';
import './Checkout.css';

/* Delivery fee, discount and total — the same rules the cart, checkout and buy-now pages show. */
export const useTotals = (subtotal) => {
  const { settings, coupon } = useContext(StoreContext);
  const threshold = Number(settings.freeDeliveryThreshold) || 0;
  const isFreeDelivery = !!(threshold && subtotal >= threshold);
  const deliveryFee = subtotal === 0 ? 0
    : coupon?.deliveryFee !== undefined ? coupon.deliveryFee
    : isFreeDelivery ? 0 : Number(settings.deliveryFee || 40);
  const discount = coupon?.discount || 0;
  return { subtotal, deliveryFee, discount, threshold, isFreeDelivery, total: Math.max(0, subtotal - discount) + deliveryFee };
};

/* Address form state, pre-filled from the signed-in user's saved address. */
export const useAddress = () => {
  const { user } = useContext(StoreContext);
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', street: '', city: '', state: '', zipcode: '', country: 'India', phone: '' });
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!user) return;
    const a = user.address || {};
    setData((prev) => ({
      firstName: a.firstName || user.name?.split(' ')[0] || prev.firstName,
      lastName: a.lastName || user.name?.split(' ').slice(1).join(' ') || prev.lastName,
      email: a.email || user.email || prev.email,
      phone: a.phone || user.phone || prev.phone,
      street: a.street || prev.street,
      city: a.city || prev.city,
      state: a.state || prev.state,
      zipcode: a.zipcode || prev.zipcode,
      country: a.country || prev.country || 'India',
    }));
    setPrefilled(!!a.street);
  }, [user]);

  const onChange = (e) => setData((d) => ({ ...d, [e.target.name]: e.target.value }));
  return { data, onChange, prefilled };
};

export const CheckoutSteps = ({ step }) => (
  <ol className="co-steps" aria-label="Checkout progress">
    {['Cart', 'Delivery', 'Payment'].map((label, i) => (
      <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
        <span>{i < step ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>{label}
      </li>
    ))}
  </ol>
);

const Field = ({ label, name, data, onChange, half, ...rest }) => (
  <div className={`field ${half ? 'half' : ''}`}>
    <label htmlFor={`co-${name}`}>{label}</label>
    <input id={`co-${name}`} className="input" name={name} value={data[name]} onChange={onChange} required {...rest} />
  </div>
);

export const AddressForm = ({ data, onChange, prefilled }) => (
  <div className="co-card">
    <div className="co-card-head">
      <span className="co-icon"><Icon name="mapPin" size={20} /></span>
      <div>
        <h2>Delivery details</h2>
        <p>{prefilled ? 'We filled in your saved address — check it before paying.' : 'Where should we bring your order?'}</p>
      </div>
    </div>

    <h3 className="co-sub">Contact</h3>
    <div className="co-fields">
      <Field label="First name" name="firstName" data={data} onChange={onChange} half autoComplete="given-name" />
      <Field label="Last name" name="lastName" data={data} onChange={onChange} half autoComplete="family-name" />
      <Field label="Mobile number" name="phone" data={data} onChange={onChange} half type="tel" inputMode="tel" placeholder="For delivery updates" autoComplete="tel" />
      <Field label="Email" name="email" data={data} onChange={onChange} half type="email" placeholder="For your receipt" autoComplete="email" />
    </div>

    <h3 className="co-sub">Address</h3>
    <div className="co-fields">
      <Field label="Flat / house no., street, area" name="street" data={data} onChange={onChange} placeholder="e.g. 12B, Lake View Apartments, MG Road" autoComplete="street-address" />
      <Field label="City" name="city" data={data} onChange={onChange} half autoComplete="address-level2" />
      <Field label="State" name="state" data={data} onChange={onChange} half autoComplete="address-level1" />
      <Field label="Pincode" name="zipcode" data={data} onChange={onChange} half inputMode="numeric" autoComplete="postal-code" />
      <Field label="Country" name="country" data={data} onChange={onChange} half autoComplete="country-name" />
    </div>
  </div>
);

const couponLabel = (c, cur) =>
  c.type === 'percentage' ? `${c.value}% OFF` : c.type === 'fixed' ? `${cur}${c.value} OFF` : 'FREE DELIVERY';

/* Coupon entry plus "ticket" cards for every public offer, with how far the cart is from each minimum. */
export const CouponBox = ({ items, subtotal }) => {
  const { url, token, setShowLogin, coupon, setCoupon, publicCoupons, settings } = useContext(StoreContext);
  const cur = settings.currencySymbol;
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  const apply = async (raw) => {
    const code = (raw || input).trim().toUpperCase();
    if (!code || !items.length) return;
    if (!token) { setShowLogin(true); return; }
    setLoading(code); setError('');
    try {
      const res = await axios.post(`${url}/api/order/coupon`, { items, code }, { headers: { token } });
      if (res.data.success) {
        setCoupon({ code: res.data.code, discount: res.data.discount, deliveryFee: res.data.deliveryFee });
        setInput('');
      } else setError(res.data.message || 'This code is not valid.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not check this code. Try again.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="co-card co-coupons">
      <div className="co-card-head small">
        <span className="co-icon"><Icon name="tag" size={18} /></span>
        <div><h2>Offers &amp; coupons</h2></div>
      </div>

      {coupon ? (
        <div className="co-applied">
          <Icon name="check" size={18} stroke={3} />
          <div>
            <strong>{coupon.code} applied</strong>
            <span>{coupon.discount > 0 ? `You save ${cur}${coupon.discount}` : 'Delivery discount applied'}</span>
          </div>
          <button type="button" onClick={() => { setCoupon(null); setError(''); }}>Remove</button>
        </div>
      ) : (
        <div className="co-code">
          <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="Enter coupon code" aria-label="Coupon code"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} />
          <button type="button" onClick={() => apply()} disabled={!input.trim() || !!loading}>{loading && loading === input.trim().toUpperCase() ? 'Checking…' : 'Apply'}</button>
        </div>
      )}
      {error && <div className="co-error" role="alert">{error}</div>}

      {publicCoupons?.length > 0 && (
        <div className="co-tickets">
          {publicCoupons.map((c) => {
            const short = Math.max(0, (c.minOrderAmount || 0) - subtotal);
            const active = coupon?.code === c.code;
            return (
              <div key={c._id || c.code} className={`co-ticket ${active ? 'active' : ''} ${short ? 'locked' : ''}`}>
                <div className="co-ticket-value">{couponLabel(c, cur)}</div>
                <div className="co-ticket-body">
                  <strong>{c.code}</strong>
                  <span>{c.description || (c.minOrderAmount ? `On orders above ${cur}${c.minOrderAmount}` : 'On any order')}</span>
                  {short > 0 && <small>Add {cur}{short} more to unlock</small>}
                </div>
                <button type="button" disabled={active || short > 0 || !!loading} onClick={() => apply(c.code)}>
                  {active ? 'Applied' : loading === c.code ? '…' : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* Bill breakdown with a progress bar towards free delivery. */
export const PriceSummary = ({ totals, children, itemCount }) => {
  const { settings, coupon } = useContext(StoreContext);
  const cur = settings.currencySymbol;
  const { subtotal, deliveryFee, discount, threshold, isFreeDelivery, total } = totals;
  const left = Math.max(0, threshold - subtotal);

  return (
    <div className="co-card co-bill">
      <h2 className="co-bill-title">Bill details</h2>
      {threshold > 0 && subtotal > 0 && (
        <div className={`co-free ${isFreeDelivery ? 'done' : ''}`}>
          <div className="co-free-text">
            <Icon name="truck" size={16} />
            {isFreeDelivery ? <span><strong>Free delivery</strong> unlocked!</span> : <span>Add <strong>{cur}{left}</strong> more for free delivery</span>}
          </div>
          <div className="co-free-bar"><span style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} /></div>
        </div>
      )}
      <div className="co-rows">
        <div><span>Item total{itemCount ? ` (${itemCount})` : ''}</span><span>{cur}{subtotal}</span></div>
        {discount > 0 && <div className="save"><span>Coupon {coupon?.code}</span><span>−{cur}{discount}</span></div>}
        <div><span>Delivery fee</span><span>{deliveryFee === 0 && subtotal > 0 ? <em className="free">FREE</em> : `${cur}${deliveryFee}`}</span></div>
        <div className="grand"><span>To pay</span><span>{cur}{total}</span></div>
      </div>
      {children}
      <div className="co-secure"><Icon name="lock" size={15} />Secure payments by Razorpay · UPI, cards, net banking</div>
    </div>
  );
};

export const EmptyCart = () => (
  <div className="empty-state card co-empty">
    <div className="empty-icon"><Icon name="bag" size={36} /></div>
    <h2>Your cart is empty</h2>
    <p>Biryani, dosas, burgers, shakes — find something delicious and it'll show up here.</p>
    <Link to="/#menu" className="btn btn-primary btn-lg">Browse the menu</Link>
  </div>
);
