import React from 'react';
import './Explorer.css';
import { menu_list } from '../../assets/assets';

const CATEGORY_IMAGES = {
  Salad: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800",
  Rolls: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800",
  Deserts: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800",
  Sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800",
  Cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800",
  "Pure Veg": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800",
  Pasta: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=800",
  Noodles: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800"
};

function Explorer({ Category, Setcategory }) {
  const handleSelect = (cat) => {
    Setcategory(prev => prev === cat ? 'All' : cat);
    // Smooth scroll down to dishes grid
    const dishesEl = document.getElementById('dishes');
    if (dishesEl) dishesEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className='explore container' id='menu'>
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Handcrafted Flavors</div>
          <h2 className="section-title">Shop by Category</h2>
          <p className="section-sub">Explore our artisanal selection of freshly prepared delicacies.</p>
        </div>
      </div>

      {/* Visual Category Banner Grid (Inspired by Breadly design mockup) */}
      <div className="category-banner-grid">
        {menu_list.map((item) => {
          const bgImage = CATEGORY_IMAGES[item.menu_name] || item.menu_image;
          const isActive = Category === item.menu_name;
          return (
            <div
              key={item.menu_name}
              className={`cat-card ${isActive ? 'active' : ''}`}
              onClick={() => handleSelect(item.menu_name)}
            >
              <img src={bgImage} alt={item.menu_name} className="cat-card-bg" loading="lazy" />
              <div className="cat-card-overlay" />
              <div className="cat-card-content">
                <span className="cat-card-badge">Fresh Prep</span>
                <h3 className="cat-card-title">{item.menu_name}</h3>
                <span className="cat-card-link">
                  {isActive ? 'Showing dishes ✓' : 'Explore Category →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Filter Pills */}
      <div className='explore-pills' role="tablist" aria-label="Category filter pills">
        <button
          role="tab"
          aria-selected={Category === 'All'}
          className={`cat-pill ${Category === 'All' ? 'active' : ''}`}
          onClick={() => Setcategory('All')}
        >
          All Items
        </button>
        {menu_list.map((item) => (
          <button
            key={item.menu_name}
            role="tab"
            aria-selected={Category === item.menu_name}
            className={`cat-pill ${Category === item.menu_name ? 'active' : ''}`}
            onClick={() => Setcategory(prev => prev === item.menu_name ? 'All' : item.menu_name)}
          >
            {item.menu_name}
          </button>
        ))}
      </div>
    </section>
  );
}

export default Explorer;

