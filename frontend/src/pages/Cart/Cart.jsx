import React, { useContext, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { CartControl, VegMark } from '../../component/Fooditem/Fooditem';
import { catLabel } from '../../component/Explorermenu/categories';
import { CheckoutSteps, CouponBox, EmptyCart, PriceSummary, useTotals } from '../../component/Checkout/Checkout';
import ProductRail from '../../component/ProductRail/ProductRail';
import Icon from '../../component/Icon';
import './Cart.css';

const ADD_ONS = ['Cool Drinks', 'Juices & Shakes', 'Deserts', 'Coffee & Tea'];

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartLoaded, food_list, foodLoading, clearItem, get_total_Cart_amount, imageSrc, settings, token, setShowLogin, cartCount } = useContext(StoreContext);
  const cur = settings.currencySymbol;

  useEffect(() => { document.title = 'Your cart — Arsha'; }, []);

  const lines = food_list.filter((f) => cartItems[f._id] > 0);
  const totals = useTotals(get_total_Cart_amount());
  const items = lines.map((f) => ({ id: f._id, quantity: cartItems[f._id] }));

  // Drinks and desserts that aren't in the cart yet — the classic "complete your meal" add-ons.
  const addOns = useMemo(
    () => food_list.filter((f) => ADD_ONS.includes(f.category) && !cartItems[f._id]).slice(0, 10),
    [food_list, cartItems]
  );

  const checkout = () => {
    if (!token) { setShowLogin(true); return; }
    navigate('/order');
  };

  if (!foodLoading && cartLoaded && lines.length === 0) {
    return <div className="container co-page"><EmptyCart /></div>;
  }

  return (
    <div className="container co-page">
      <div className="co-title-row">
        <div>
          <h1 className="co-title">Your cart</h1>
          <p>{cartCount} item{cartCount === 1 ? '' : 's'} · cooked fresh once you order</p>
        </div>
        <CheckoutSteps step={0} />
      </div>

      <div className="co-layout">
        <div className="co-card cart-list">
          {lines.map((f) => (
            <div className="cart-line" key={f._id}>
              <Link to={`/viewproduct/${f._id}`} className="cart-thumb"><img src={imageSrc(f.image, 200)} alt="" /></Link>
              <div className="cart-info">
                <span className="cart-meta"><VegMark isVeg={f.isVeg !== false} size={14} />{catLabel(f.category)}</span>
                <Link to={`/viewproduct/${f._id}`} className="cart-name">{f.name}</Link>
                <span className="cart-each">{cur}{f.price} each</span>
              </div>
              <div className="cart-qty"><CartControl id={f._id} name={f.name} /></div>
              <div className="cart-total">{cur}{f.price * cartItems[f._id]}</div>
              <button className="cart-remove" onClick={() => clearItem(f._id)} aria-label={`Remove ${f.name}`}><Icon name="trash" size={18} /></button>
            </div>
          ))}
          <Link to="/#menu" className="co-edit cart-more"><Icon name="plus" size={16} />Add more items</Link>
        </div>

        <aside className="co-side">
          <CouponBox items={items} subtotal={totals.subtotal} />
          <PriceSummary totals={totals} itemCount={cartCount}>
            <button className="btn btn-primary btn-block co-pay" onClick={checkout}>
              <span>{cur}{totals.total}</span>
              <span className="co-pay-label">{token ? 'Proceed to checkout' : 'Sign in to checkout'}<Icon name="arrowRight" size={18} /></span>
            </button>
          </PriceSummary>
        </aside>
      </div>

      {addOns.length > 0 && (
        <section className="cart-addons">
          <div className="section-head">
            <div>
              <div className="section-eyebrow">Complete your meal</div>
              <h2 className="section-title">Add a drink or <em>dessert</em></h2>
            </div>
          </div>
          <ProductRail items={addOns} label="add-ons" />
        </section>
      )}
    </div>
  );
};

export default Cart;
