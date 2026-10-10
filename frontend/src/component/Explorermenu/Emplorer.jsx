import React, { useContext, useMemo, useRef } from 'react';
import { StoreContext } from '../../context/Storecontext';
import ProductRail from '../ProductRail/ProductRail';
import { Reveal } from '../Motion';
import Icon from '../Icon';
import { catLabel, recommended, useCategories, withFallback } from './categories';
import './Explorer.css';

function Explorer({ Category, Setcategory }) {
  const { food_list, foodLoading } = useContext(StoreContext);
  const categories = useCategories();
  const strip = useRef(null);

  const railItems = useMemo(
    () => recommended(food_list.filter((f) => Category === 'All' || f.category === Category), true).slice(0, 12),
    [food_list, Category]
  );
  const scroll = (dir) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className="section container" id="categories">
      <Reveal className="cat-head">
        <div>
          <span className="section-tag">Handcrafted in our kitchen</span>
          <h2 className="section-title">What are you <em>craving</em> today?</h2>
          <p className="section-sub">{categories.length} categories · from dum biryani and dosas to cold brews and sundaes.</p>
        </div>
        <div className="cat-arrows">
          <button onClick={() => scroll(-1)} aria-label="Previous categories"><Icon name="arrowLeft" size={18} /></button>
          <button onClick={() => scroll(1)} aria-label="Next categories"><Icon name="arrowRight" size={18} /></button>
        </div>
      </Reveal>

      <div className="cat-strip" ref={strip} role="tablist" aria-label="Categories">
        {foodLoading && !categories.length
          ? Array.from({ length: 7 }, (_, i) => <div key={i} className="cat-card skeleton" />)
          : categories.map((c, i) => {
            const active = Category === c.name;
            return (
              <button key={c.name} role="tab" aria-selected={active} className={`cat-card ${active ? 'active' : ''}`}
                style={{ '--d': `${Math.min(i, 8) * 0.05}s` }}
                onClick={() => Setcategory((prev) => (prev === c.name ? 'All' : c.name))}>
                <img src={c.photo} alt="" loading="lazy" onError={withFallback(c.fallback)} />
                <span className="cat-card-shade" />
                {active && <span className="cat-card-check"><Icon name="check" size={14} stroke={3} /></span>}
                <span className="cat-card-text">
                  <strong>{c.label}</strong>
                  <small>{c.count} dish{c.count === 1 ? '' : 'es'}</small>
                </span>
                <span className="cat-card-go"><Icon name="arrowUpRight" size={16} /></span>
              </button>
            );
          })}
      </div>

      <div className="cat-rail-head">
        <div>
          <h3>{Category === 'All' ? 'Popular picks' : `Best of ${catLabel(Category)}`}</h3>
          <p>{Category === 'All' ? 'Our most-loved dishes, cooked fresh to order' : `Freshly made ${catLabel(Category).toLowerCase()}, ready in minutes`}</p>
        </div>
        <div className="cat-rail-actions">
          {Category !== 'All' && <button className="cat-clear" onClick={() => Setcategory('All')}><Icon name="close" size={14} />{catLabel(Category)}</button>}
          <a href="#menu" className="cat-see-all">View full menu <Icon name="arrowRight" size={16} /></a>
        </div>
      </div>
      <ProductRail items={railItems} loading={foodLoading} label={Category === 'All' ? 'popular dishes' : `${catLabel(Category)} dishes`} />
    </section>
  );
}

export default Explorer;
