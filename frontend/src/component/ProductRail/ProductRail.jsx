import React, { useEffect, useRef, useState } from 'react';
import Fooditem from '../Fooditem/Fooditem';
import Icon from '../Icon';
import './ProductRail.css';

// Horizontally scrolling row of product cards with prev/next buttons (scroll-snap, touch friendly).
const ProductRail = ({ items, loading, label = 'Products' }) => {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [items]);

  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });

  return (
    <div className="rail">
      <button className="rail-btn prev" onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Previous ${label}`}>
        <Icon name="arrowLeft" size={18} />
      </button>
      <div className="rail-track" ref={ref} onScroll={update} role="list" aria-label={label}>
        {loading
          ? [0, 1, 2, 3].map((i) => <div key={i} className="rail-item skeleton" style={{ height: 380 }} />)
          : items.map((item, i) => (
            <div className="rail-item" role="listitem" key={item._id}>
              <Fooditem item={item} index={i} />
            </div>
          ))}
      </div>
      <button className="rail-btn next" onClick={() => scroll(1)} disabled={edges.end} aria-label={`Next ${label}`}>
        <Icon name="arrowRight" size={18} />
      </button>
    </div>
  );
};

export default ProductRail;
