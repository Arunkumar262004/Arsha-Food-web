import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import Icon from '../Icon';
import './Fooditem.css';

// Add button turns into a quantity stepper once the item is in the cart — one control, never two.
export const CartControl = ({ id, name, large }) => {
  const { cartItems, addToCart, removeItemFromCart } = useContext(StoreContext);
  const qty = cartItems[id] || 0;
  if (!qty) {
    return large ? (
      <button className="btn btn-primary" onClick={() => addToCart(id)}><Icon name="plus" size={18} />Add to cart</button>
    ) : (
      <button className="food-add" onClick={() => addToCart(id)} aria-label={`Add ${name} to cart`}>
        <Icon name="plus" size={18} stroke={2.4} /><span>Add</span>
      </button>
    );
  }
  return (
    <div className={`stepper ${large ? 'stepper-lg' : ''}`} role="group" aria-label={`${name} quantity`}>
      <button onClick={() => removeItemFromCart(id)} aria-label={`Remove one ${name}`}><Icon name="minus" size={18} stroke={2.4} /></button>
      <span aria-live="polite">{qty}</span>
      <button onClick={() => addToCart(id)} aria-label={`Add one more ${name}`}><Icon name="plus" size={18} stroke={2.4} /></button>
    </div>
  );
};

const Fooditem = ({ id, name, price, description, image, category }) => {
  const { imageSrc, settings } = useContext(StoreContext);

  return (
    <article className='food-card'>
      <Link to={`/viewproduct/${id}`} className="food-media">
        <img src={imageSrc(image)} alt={name} loading="lazy" />
        {category && <span className="food-tag">{category}</span>}
      </Link>
      <div className="food-body">
        <Link to={`/viewproduct/${id}`} className="food-name">{name}</Link>
        <p className='food-desc'>{description}</p>
        <div className="food-foot">
          <span className="food-price">{settings.currencySymbol}{price}</span>
          <CartControl id={id} name={name} />
        </div>
      </div>
    </article>
  );
};

export default Fooditem;
