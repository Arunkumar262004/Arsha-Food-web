import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { catLabel } from '../Explorermenu/categories';
import Icon from '../Icon';
import { Reveal } from '../Motion';
import './Fooditem.css';

// Indian food-labelling mark: green square/dot = veg, brown square/triangle = non-veg.
export const VegMark = ({ isVeg = true, size = 16 }) => (
  <span className={`veg-mark ${isVeg ? 'veg' : 'nonveg'}`} style={{ width: size, height: size }}
    title={isVeg ? 'Vegetarian' : 'Non-vegetarian'} aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'} role="img" />
);

// ADD button turns into a quantity stepper once the item is in the cart — one control, never two.
export const CartControl = ({ id, name, large }) => {
  const { cartItems, addToCart, removeItemFromCart } = useContext(StoreContext);
  const qty = cartItems[id] || 0;
  if (!qty) {
    return large ? (
      <button className="btn btn-primary" onClick={() => addToCart(id)}><Icon name="plus" size={18} />Add to cart</button>
    ) : (
      <button className="add-btn" onClick={() => addToCart(id)} aria-label={`Add ${name} to cart`}>
        ADD<Icon name="plus" size={14} stroke={3} />
      </button>
    );
  }
  return (
    <div className={`stepper ${large ? 'stepper-lg' : ''}`} role="group" aria-label={`${name} quantity`}>
      <button onClick={() => removeItemFromCart(id)} aria-label={`Remove one ${name}`}><Icon name="minus" size={16} stroke={2.6} /></button>
      <span aria-live="polite">{qty}</span>
      <button onClick={() => addToCart(id)} aria-label={`Add one more ${name}`}><Icon name="plus" size={16} stroke={2.6} /></button>
    </div>
  );
};

const Fooditem = ({ item, index = 0 }) => {
  const { imageSrc, settings } = useContext(StoreContext);
  const { _id: id, name, price, description, image, category, isVeg, tag } = item;
  const to = `/viewproduct/${id}`;

  return (
    <Reveal as="article" className="fc" delay={Math.min(index % 4, 3) * 0.07}>
      <Link to={to} className="fc-media" tabIndex={-1} aria-hidden="true">
        <img src={imageSrc(image, 560)} alt="" loading="lazy" />
        {tag && <span className={`fc-tag ${/spicy/i.test(tag) ? 'hot' : ''}`}>{tag}</span>}
      </Link>
      <div className="fc-body">
        <div className="fc-meta">
          <VegMark isVeg={isVeg !== false} />
          <span>{catLabel(category)}</span>
        </div>
        <Link to={to} className="fc-name">{name}</Link>
        <p className="fc-desc">{description}</p>
        <div className="fc-foot">
          <span className="fc-price">{settings.currencySymbol}{price}</span>
          <CartControl id={id} name={name} />
        </div>
      </div>
    </Reveal>
  );
};

export default Fooditem;
