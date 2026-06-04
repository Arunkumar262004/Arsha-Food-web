import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { assets } from "../../assets/assets";

const Productview = () => {
  const { cartItems, removeItemFromCart, addToCart } = useContext(StoreContext);
  const { id } = useParams();
  const [foodId, setFoodid] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const url = "https://arsha-food-web.onrender.com";
  const navigate = useNavigate();

  useEffect(() => {
    document.title = foodId ? `${foodId.name}` : "Food Page";
    const fetch_food_id = async () => {
      try {
        const response = await axios.get(`${url}/api/food/getid/${id}`);
        setFoodid(response.data.dataid);
      } catch (err) {
        console.error("Error fetching food:", err);
      }
    };
    fetch_food_id();
  }, [id]);

  const qty = cartItems[id] || 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pv-page {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', -apple-system, sans-serif;
          padding: 32px 24px 80px;
        }

        /* BREADCRUMB */
        .pv-breadcrumb {
          max-width: 1000px;
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
        }
        .pv-breadcrumb a { color: #64748b; text-decoration: none; font-weight: 500; }
        .pv-breadcrumb a:hover { color: #f97316; }
        .pv-breadcrumb span { color: #cbd5e1; }

        /* CARD */
        .pv-card {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          display: grid;
          grid-template-columns: 420px 1fr;
        }

        /* IMAGE SIDE */
        .pv-img-side {
          position: relative;
          background: #fff8f3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          min-height: 480px;
        }
        .pv-img-side img {
          width: 100%;
          max-width: 340px;
          height: 320px;
          object-fit: cover;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          transition: opacity .4s ease;
        }
        .pv-img-badge {
          position: absolute;
          top: 24px;
          left: 24px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 20px;
        }
        .pv-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(249,115,22,0.04), transparent);
          pointer-events: none;
          border-radius: inherit;
        }

        /* INFO SIDE */
        .pv-info {
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }
        .pv-top {}

        /* CATEGORY TAG */
        .pv-category {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fff7ed;
          color: #f97316;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid #fed7aa;
          margin-bottom: 14px;
        }

        /* NAME */
        .pv-name {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        /* DESC */
        .pv-desc {
          font-size: 15px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 18px;
        }

        /* RATINGS */
        .pv-ratings {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
        }
        .pv-stars {
          display: flex;
          gap: 2px;
        }
        .pv-star { color: #f59e0b; font-size: 16px; }
        .pv-rating-text { font-size: 13px; color: #64748b; font-weight: 500; }
        .pv-rating-count {
          font-size: 13px;
          color: #94a3b8;
          padding-left: 10px;
          border-left: 1px solid #e2e8f0;
        }

        /* PRICE BLOCK */
        .pv-price-block {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 8px;
        }
        .pv-price {
          font-size: 38px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
        }
        .pv-price-badge {
          background: #dcfce7;
          color: #16a34a;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .pv-delivery-note {
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 28px;
        }

        /* DIVIDER */
        .pv-divider { height: 1px; background: #f1f5f9; margin-bottom: 24px; }

        /* QUANTITY */
        .pv-qty-label { font-size: 12px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; }
        .pv-qty-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .pv-qty-btn {
          width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid #e2e8f0;
          background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: #374151; font-weight: 600; transition: all .15s;
        }
        .pv-qty-btn:hover { border-color: #f97316; color: #f97316; background: #fff7ed; }
        .pv-qty-img { width: 32px; height: 32px; cursor: pointer; transition: transform .15s; }
        .pv-qty-img:hover { transform: scale(1.1); }
        .pv-qty-num {
          font-size: 18px; font-weight: 700; color: #0f172a; min-width: 28px; text-align: center;
          background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 4px 10px;
        }
        .pv-add-first {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #f97316, #ea580c); color: white;
          font-size: 14px; font-weight: 700; padding: 10px 20px; border-radius: 10px;
          border: none; cursor: pointer; transition: all .2s; font-family: inherit;
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        .pv-add-first:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(249,115,22,0.4); }

        /* ACTION BUTTONS */
        .pv-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pv-btn {
          padding: 14px 20px; border-radius: 14px; font-size: 15px; font-weight: 700;
          cursor: pointer; border: none; display: flex; align-items: center; justify-content: center;
          gap: 8px; font-family: inherit; transition: all .2s; letter-spacing: 0.01em;
        }
        .pv-btn-buy {
          background: linear-gradient(135deg, #f97316, #ea580c); color: white;
          box-shadow: 0 4px 14px rgba(249,115,22,0.4);
        }
        .pv-btn-buy:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.5); }
        .pv-btn-cart {
          background: white; color: #f97316;
          border: 2px solid #f97316;
        }
        .pv-btn-cart:hover { background: #fff7ed; }

        /* TRUST ROW */
        .pv-trust {
          display: flex; gap: 16px; margin-top: 8px;
        }
        .pv-trust-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #64748b; font-weight: 500;
        }
        .pv-trust-icon { color: #16a34a; }

        /* SKELETON */
        .pv-skeleton-card {
          max-width: 1000px; margin: 0 auto;
          background: white; border-radius: 24px; padding: 40px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: grid;
          grid-template-columns: 420px 1fr; gap: 40px;
        }
        .pv-skel {
          border-radius: 12px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        @media (max-width: 768px) {
          .pv-card { grid-template-columns: 1fr; }
          .pv-img-side { min-height: 300px; padding: 28px; }
          .pv-info { padding: 28px 24px; }
          .pv-name { font-size: 26px; }
          .pv-price { font-size: 30px; }
        }
      `}</style>

      <div className="pv-page">
        {/* Breadcrumb */}
        <nav className="pv-breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/menu">Menu</Link>
          <span>›</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{foodId?.name || '...'}</span>
        </nav>

        {foodId ? (
          <div className="pv-card">
            {/* Image Side */}
            <div className="pv-img-side">
              <div className="pv-img-overlay"></div>
              <div className="pv-img-badge">Special Price</div>
              <img
                src={`${url}/images/${foodId.image}`}
                alt={foodId.name}
                onLoad={() => setImgLoaded(true)}
                style={{ opacity: imgLoaded ? 1 : 0 }}
              />
            </div>

            {/* Info Side */}
            <div className="pv-info">
              <div className="pv-top">
                {/* Category */}
                <div className="pv-category">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {foodId.category}
                </div>

                {/* Name */}
                <h1 className="pv-name">{foodId.name}</h1>

                {/* Description */}
                <p className="pv-desc">{foodId.description}</p>

                {/* Ratings */}
                <div className="pv-ratings">
                  <div className="pv-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="pv-star">{s <= 4 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="pv-rating-text">4.0</span>
                  <span className="pv-rating-count">242 Ratings · 23 Reviews</span>
                </div>

                {/* Price */}
                <div className="pv-price-block">
                  <span className="pv-price">₹{foodId.price}</span>
                  <span className="pv-price-badge">Best Price</span>
                </div>
                <p className="pv-delivery-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                  Free delivery on orders above ₹49
                </p>

                <div className="pv-divider"></div>

                {/* Quantity Control */}
                <div className="pv-qty-label">Quantity</div>
                <div className="pv-qty-row">
                  {qty === 0 ? (
                    <button className="pv-add-first" onClick={() => addToCart(id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      Add to Cart
                    </button>
                  ) : (
                    <>
                      <img className="pv-qty-img" onClick={() => removeItemFromCart(id)} src={assets.remove_icon_red} alt="Remove" />
                      <span className="pv-qty-num">{qty}</span>
                      <img className="pv-qty-img" onClick={() => addToCart(id)} src={assets.add_icon_green} alt="Add" />
                    </>
                  )}
                </div>
              </div>

              {/* CTA Buttons */}
              <div>
                <div className="pv-actions">
                  <button
                    className="pv-btn pv-btn-buy"
                    onClick={() => navigate(`/place_single_order/${id}`)}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    Buy Now
                  </button>
                  <button
                    className="pv-btn pv-btn-cart"
                    onClick={() => addToCart(id)}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                    Add To Cart
                  </button>
                </div>

                {/* Trust indicators */}
                <div className="pv-trust">
                  <div className="pv-trust-item">
                    <svg className="pv-trust-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    100% Safe
                  </div>
                  <div className="pv-trust-item">
                    <svg className="pv-trust-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    Fresh Ingredients
                  </div>
                  <div className="pv-trust-item">
                    <svg className="pv-trust-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    30 min delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pv-skeleton-card">
            <div className="pv-skel" style={{ height: '320px', borderRadius: '16px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '8px' }}>
              <div className="pv-skel" style={{ height: '14px', width: '30%' }}></div>
              <div className="pv-skel" style={{ height: '36px', width: '80%' }}></div>
              <div className="pv-skel" style={{ height: '14px', width: '60%' }}></div>
              <div className="pv-skel" style={{ height: '14px', width: '45%' }}></div>
              <div className="pv-skel" style={{ height: '40px', width: '35%', marginTop: '8px' }}></div>
              <div className="pv-skel" style={{ height: '50px', marginTop: '16px' }}></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Productview;