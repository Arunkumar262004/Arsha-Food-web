import React, { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import Fooditem from '../Fooditem/Fooditem';
import Icon from '../Icon';
import './Fooddisplay.css';

const Fooddisplay = ({ Category, query = '', onClearSearch }) => {
  const { food_list, foodLoading } = useContext(StoreContext);
  const [sort, setSort] = useState('popular');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = food_list.filter((item) =>
      (Category === 'All' || Category === item.category) &&
      (!q || item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q))
    );
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [food_list, Category, query, sort]);

  return (
    <section className='food-display container' id='dishes'>
      <div className="fd-head">
        <div>
          <div className="section-eyebrow">Our Menu Collection</div>
          <h2 className="section-title">
            {query ? <>Results for “{query}”</> : Category === 'All' ? 'Our Freshly Prepared Delights' : `${Category} Specials`}
          </h2>
          <p className="section-sub">
            {items.length} artisan dish{items.length === 1 ? '' : 'es'} available for instant delivery
          </p>
        </div>

        <div className="fd-tools">
          {query && <button className="btn btn-ghost btn-sm" onClick={onClearSearch}><Icon name="close" size={16} />Clear search</button>}
          <select className="fd-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort dishes">
            <option value="popular">Recommended</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {foodLoading ? (
        <div className="fd-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="skeleton" style={{ height: 360, borderRadius: 24 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><Icon name="search" size={36} /></div>
          <h2>No dishes found</h2>
          <p>{query ? 'Try a different search, or browse the full menu.' : 'Nothing in this category yet — try another one.'}</p>
          <Link to="/#menu" className="btn btn-primary" onClick={onClearSearch}>Browse full menu</Link>
        </div>
      ) : (
        <div className="fd-grid">
          {items.map((item) => (
            <Fooditem key={item._id} id={item._id} name={item.name} description={item.description}
              price={item.price} image={item.image} category={item.category} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Fooddisplay;
