import React, { useContext, useEffect, useState } from 'react';
import './Cart.css';
import { useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';

const Cart = () => {
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    document.title = "Your Cart — Arsha Food";
  }, []);

  const {
    cartItems,
    food_list,
    removeItemFromCart,
    get_total_Cart_amount,
    imageSrc,
    settings,
    token,
    setShowLogin,
    publicCoupons
  } = useContext(StoreContext);

  const sym = settings.currencySymbol;
  const subtotal = get_total_Cart_amount();
  const deliveryFee = subtotal === 0 ? 0 : settings.deliveryFee;

  const handleCheckout = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    navigate('/order');
  };

  return (
    <div className='cart container'>
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
        <br />
        <hr />
        {food_list.map((item) => {
          if (cartItems[item._id] > 0)
            return (
              <div key={item._id}>
                <div className="cart-items-title cart-items-item">
                  <img src={imageSrc(item.image)} alt='' />
                  <p>{item.name}</p>
                  <p>{sym}{item.price}</p>
                  <p>{cartItems[item._id]}</p>
                  <p>{sym}{item.price * cartItems[item._id]}</p>
                  <p onClick={() => removeItemFromCart(item._id)} className='cross'>x</p>
                </div>
                <hr />
              </div>
            );
          return null;
        })}
      </div>
      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>{sym}{subtotal}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>{sym}{deliveryFee}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Total</p>
              <p>{sym}{subtotal + deliveryFee}</p>
            </div>
          </div>
          <button onClick={handleCheckout}>PROCEED TO CHECKOUT</button>
        </div>

        <div className="cart-promo-code">
          <div>
            <p>If you have promo code Enter it here</p>
            <div className="cart-promo-code-input">
              <input
                type="text"
                placeholder='Enter promo code'
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              />
              <button onClick={() => alert(`Coupon ${promoCode || 'code'} will be validated at checkout!`)}>Apply</button>
            </div>

            {publicCoupons && publicCoupons.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f26b1d', marginBottom: 8 }}>Available Coupons:</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {publicCoupons.map((c) => (
                    <button
                      key={c._id || c.code}
                      type="button"
                      onClick={() => setPromoCode(c.code)}
                      style={{
                        background: '#ffe9da',
                        color: '#d9560c',
                        border: '1px border #f26b1d',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {c.code} ({c.type === "percentage" ? `${c.value}% OFF` : `₹${c.value} OFF`})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
