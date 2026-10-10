import React, { useContext, useEffect, useMemo, useState } from 'react';
import { StoreContext } from '../../context/Storecontext';
import Fooditem from '../Fooditem/Fooditem';
import { useCategories, catLabel, recommended } from '../Explorermenu/categories';
import { Reveal } from '../Motion';
import Icon from '../Icon';
import './Fooddisplay.css';

const PAGE = 8;

const Fooddisplay = ({ Category, Setcategory, query = '', onClearSearch }) => {
  const { food_list, foodLoading } = useContext(StoreContext);
  const categories = useCategories();
  const [sort, setSort] = useState('popular');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { setShowAll(false); }, [Category]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = food_list.filter((item) =>
      (Category === 'All' || Category === item.category) &&
      (!q || item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q))
    );
    if (sort === 'low') return [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...list].sort((a, b) => b.price - a.price);
    return recommended(list);
  }, [food_list, Category, query, sort]);

  const visible = showAll || query ? items : items.slice(0, PAGE);
  const clear = () => { Setcategory('All'); onClearSearch?.(); };

  return (
    <section className="section container food-display" id="menu">
      <Reveal className="section-head">
        <div>
          <div className="section-eyebrow">Our menu</div>
          <h2 className="section-title">
            {query ? <>Results for <em>“{query}”</em></> : Category === 'All' ? <>Freshly prepared <em>delights</em></> : <>{catLabel(Category)} <em>specials</em></>}
          </h2>
          <p className="section-sub">{items.length} dish{items.length === 1 ? '' : 'es'} ready to order · cooked when you order</p>
        </div>
        <div className="fd-tools">
          {query && <button className="btn btn-ghost btn-sm" onClick={onClearSearch}><Icon name="close" size={16} />Clear search</button>}
          <label className="fd-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort dishes">
              <option value="popular">Recommended</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
            <Icon name="chevronDown" size={16} />
          </label>
        </div>
      </Reveal>

      <div className="fd-pills" role="tablist" aria-label="Filter by category">
        {[{ name: 'All' }, ...categories].map((c) => (
          <button key={c.name} role="tab" aria-selected={Category === c.name}
            className={`fd-pill ${Category === c.name ? 'active' : ''}`} onClick={() => Setcategory(c.name)}>
            {c.name === 'All' ? 'All items' : c.label}
          </button>
        ))}
      </div>

      {foodLoading ? (
        <div className="fd-grid">
          {Array.from({ length: PAGE }, (_, i) => <div key={i} className="skeleton" style={{ height: 380, borderRadius: 20 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><Icon name="search" size={36} /></div>
          <h2>No dishes found</h2>
          <p>{query ? 'Try a different search, or browse the full menu.' : 'Nothing in this category yet — try another one.'}</p>
          <button className="btn btn-primary" onClick={clear}>Browse full menu</button>
        </div>
      ) : (
        <>
          <div className="fd-grid">
            {visible.map((item, i) => (
              <Fooditem key={item._id} item={item} index={i} />
            ))}
          </div>
          {visible.length < items.length && (
            <div className="fd-more">
              <button className="btn btn-outline btn-lg" onClick={() => setShowAll(true)}>
                Show all {items.length} dishes <Icon name="chevronDown" size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Fooddisplay;
