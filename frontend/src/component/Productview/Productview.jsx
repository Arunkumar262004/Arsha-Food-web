import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import Fooditem, { CartControl, VegMark } from '../Fooditem/Fooditem';
import { catLabel } from '../Explorermenu/categories';
import { Reveal } from '../Motion';
import Icon from '../Icon';
import './Productview.css';

const PACKS = [
  { n: 1, label: 'Single portion', note: 'Just for you' },
  { n: 2, label: 'Two portions', note: 'Great for sharing' },
  { n: 3, label: 'Family pack', note: 'Three portions' },
];

const Stars = ({ value, size = 16 }) => (
  <span className="pv-stars" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} className={i <= Math.round(value) ? 'on' : ''} />)}
  </span>
);

const Accordion = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`pv-acc ${open ? 'open' : ''}`}>
      <button className="pv-acc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {title}<Icon name={open ? 'minus' : 'plus'} size={18} />
      </button>
      <div className="pv-acc-body"><div>{children}</div></div>
    </div>
  );
};

const Productview = () => {
  const { cartItems, addToCart, imageSrc, url, token, setShowLogin, publicCoupons, food_list, settings } = useContext(StoreContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const cur = settings.currencySymbol;

  const [food, setFood] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [pack, setPack] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    let alive = true;
    setFood(null); setNotFound(false); setActiveImg(0); setPack(1);
    axios.get(`${url}/api/food/getid/${id}`)
      .then((res) => {
        if (!alive) return;
        if (res.data?.dataid) {
          setFood(res.data.dataid);
          document.title = `${res.data.dataid.name} — Arsha`;
        } else setNotFound(true);
      })
      .catch(() => alive && setNotFound(true));
    return () => { alive = false; };
  }, [id, url]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${url}/api/reviews/product/${id}`);
      if (res.data.success) {
        setReviews(res.data.data || []);
        setAvgRating(Number(res.data.averageRating) || 0);
        setReviewCount(res.data.totalReviews || 0);
      }
    } catch (err) {
      console.error('Error fetching reviews', err);
    }
  };

  const checkPurchaseEligible = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${url}/api/reviews/check-purchase/${id}`, { headers: { token } });
      if (res.data.success) {
        setCanReview(res.data.canReview);
        if (res.data.userReview) {
          setUserReview(res.data.userReview);
          setRatingInput(res.data.userReview.rating || 5);
          setTitleInput(res.data.userReview.title || '');
          setCommentInput(res.data.userReview.comment || '');
        }
      }
    } catch (err) {
      console.error('Error checking review eligibility', err);
    }
  };

  useEffect(() => {
    setReviews([]); setUserReview(null); setCanReview(false); setReviewMsg(''); setReviewError('');
    fetchReviews();
    checkPurchaseEligible();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, url]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setShowLogin(true); return; }
    setSubmittingReview(true); setReviewMsg(''); setReviewError('');
    try {
      const res = await axios.post(`${url}/api/reviews/add`,
        { productId: id, rating: ratingInput, title: titleInput, comment: commentInput },
        { headers: { token } });
      if (res.data.success) {
        setReviewMsg(res.data.message || 'Review submitted for approval!');
        checkPurchaseEligible();
      } else setReviewError(res.data.message || 'Failed to submit review');
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const qty = cartItems[id] || 0;
  const images = food?.images?.length ? food.images : food?.image ? [food.image] : [];

  const crossSells = useMemo(() => {
    if (!food) return [];
    if (food.crossSells?.length) return food.crossSells;
    return food_list.filter((f) => f._id !== id && f.category !== food.category).slice(0, 4);
  }, [food, food_list, id]);

  const related = useMemo(() => {
    if (!food) return [];
    const direct = [...(food.relatedProducts || []), ...(food.upsells || [])];
    if (direct.length) return direct;
    return food_list.filter((f) => f._id !== id && f.category === food.category).slice(0, 4);
  }, [food, food_list, id]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const addPack = async () => {
    if (!token) { setShowLogin(true); return false; }
    setAdding(true);
    try {
      for (let i = 0; i < pack; i++) await addToCart(id);
      flash(`Added ${pack} × ${food.name} to your cart`);
      return true;
    } finally {
      setAdding(false);
    }
  };

  const buyNow = async () => {
    if (!token) { setShowLogin(true); return; }
    if (qty === 0 && !(await addPack())) return;
    navigate(`/place_single_order/${id}`);
  };

  const copy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const couponLabel = (c) =>
    c.type === 'percentage' ? `${c.value}% off${c.maxDiscount ? ` (up to ${cur}${c.maxDiscount})` : ''}`
      : c.type === 'fixed' ? `${cur}${c.value} off` : 'Free delivery';

  if (notFound) {
    return (
      <div className="container">
        <div className="empty-state card" style={{ marginTop: 48 }}>
          <div className="empty-icon"><Icon name="search" size={36} /></div>
          <h2>Dish not found</h2>
          <p>This item may have been removed from the menu.</p>
          <Link to="/#menu" className="btn btn-primary">Browse the menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pv container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link><Icon name="chevronRight" size={14} />
        <Link to="/#menu">Menu</Link><Icon name="chevronRight" size={14} />
        {food && <><Link to="/#categories">{catLabel(food.category)}</Link><Icon name="chevronRight" size={14} /></>}
        <span>{food?.name || 'Loading…'}</span>
      </nav>

      {!food ? (
        <div className="pv-main">
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 24 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[30, 80, 50, 100, 100, 100].map((w, i) => <div key={i} className="skeleton" style={{ height: i > 2 ? 72 : 28, width: `${w}%` }} />)}
          </div>
        </div>
      ) : (
        <>
          <div className="pv-main">
            {/* Gallery */}
            <div className="pv-gallery">
              <div className="pv-hero">
                <img key={activeImg} src={imageSrc(images[activeImg] || food.image, 1100)} alt={food.name} />
                <span className="pv-hero-tag">{catLabel(food.category)}</span>
              </div>
              {images.length > 1 && (
                <div className="pv-thumbs">
                  {images.map((img, i) => (
                    <button key={i} className={i === activeImg ? 'active' : ''} onClick={() => setActiveImg(i)} aria-label={`Show image ${i + 1}`}>
                      <img src={imageSrc(img, 200)} alt="" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buy box */}
            <div className="pv-info">
              <a href="#reviews" className="pv-rating-line">
                <Stars value={reviewCount ? avgRating : 0} size={15} />
                {reviewCount ? <span>{avgRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? '' : 's'}</span> : <span>No reviews yet</span>}
              </a>
              <div className="pv-badges">
                <span className={`pv-diet ${food.isVeg !== false ? 'veg' : 'nonveg'}`}><VegMark isVeg={food.isVeg !== false} size={14} />{food.isVeg !== false ? 'Pure veg' : 'Non-veg'}</span>
                {food.tag && <span className="pv-tagchip">{food.tag}</span>}
              </div>
              <h1 className="pv-title">{food.name}</h1>
              <div className="pv-price">
                <strong>{cur}{food.price}</strong>
                <span className="muted">per portion</span>
              </div>
              <p className="pv-desc">{food.description}</p>

              <ul className="pv-perks">
                <li><Icon name="flame" size={17} />Cooked to order</li>
                <li><Icon name="leaf" size={17} />Fresh ingredients</li>
                <li><Icon name="shield" size={17} />Hygienic kitchen</li>
                <li><Icon name="gift" size={17} />Sealed, spill-safe pack</li>
              </ul>
              <div className="pv-stock"><span className="dot" />Available now · delivered in 25–35 mins</div>

              {qty === 0 ? (
                <>
                  <div className="pv-divider"><span>Choose your portion</span></div>
                  <div className="pv-packs" role="radiogroup" aria-label="Portion size">
                    {PACKS.map((p) => (
                      <button key={p.n} role="radio" aria-checked={pack === p.n} className={`pv-pack ${pack === p.n ? 'active' : ''}`} onClick={() => setPack(p.n)}>
                        {p.n === 2 && <span className="pv-pack-flag">Sharing</span>}
                        <span className="pv-pack-thumbs">
                          {Array.from({ length: p.n }, (_, i) => <img key={i} src={imageSrc(food.image, 120)} alt="" />)}
                        </span>
                        <span className="pv-pack-text"><strong>{p.label}</strong><small>{p.note}</small></span>
                        <span className="pv-pack-price">{cur}{food.price * p.n}</span>
                      </button>
                    ))}
                  </div>
                  <button className="pv-cta" onClick={addPack} disabled={adding}>
                    {adding ? <span className="spinner" /> : <Icon name="bag" size={20} />}
                    Add to cart · {cur}{food.price * pack}
                  </button>
                </>
              ) : (
                <div className="pv-incart">
                  <div className="pv-incart-info">
                    <strong><Icon name="check" size={18} />{qty} in your cart</strong>
                    <span>{cur}{food.price * qty} total</span>
                  </div>
                  <CartControl id={id} name={food.name} large />
                </div>
              )}
              <div className="pv-cta-row">
                <button className="btn btn-outline btn-lg" onClick={buyNow} disabled={adding}><Icon name="arrowUpRight" size={18} />Buy now</button>
                {qty > 0 && <Link to="/cart" className="btn btn-dark btn-lg">Go to cart</Link>}
              </div>

              <div className="pv-trust">
                <span><Icon name="award" size={18} />Freshness promise</span>
                <span><Icon name="truck" size={18} />Free over {cur}{settings.freeDeliveryThreshold}</span>
                <span><Icon name="lock" size={18} />Secure checkout</span>
              </div>
              <div className="pv-pay"><Icon name="card" size={16} />UPI · Cards · Net banking — powered by Razorpay</div>

              {publicCoupons?.length > 0 && (
                <div className="pv-coupons">
                  <div className="pv-coupons-title"><Icon name="tag" size={16} />Offers for you</div>
                  {publicCoupons.slice(0, 3).map((c) => (
                    <div key={c._id || c.code} className="pv-coupon">
                      <div>
                        <span className="pv-coupon-code">{c.code}</span>
                        <small>{couponLabel(c)}{c.minOrderAmount ? ` · min order ${cur}${c.minOrderAmount}` : ''}</small>
                      </div>
                      <button onClick={() => copy(c.code)}>{copiedCode === c.code ? 'Copied ✓' : 'Copy'}</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pv-accs">
                <Accordion title="Description" defaultOpen>
                  <p>{food.description}</p>
                </Accordion>
                <Accordion title="Preparation & packaging">
                  <h5>Preparation</h5>
                  <p>Cooked fresh when you order, in a kitchen that follows strict hygiene checks.</p>
                  <h5>Packaging</h5>
                  <p>Packed in sealed, food-grade containers that keep hot dishes hot and cold dishes cold.</p>
                  <h5>Best enjoyed</h5>
                  <p>Within 30 minutes of delivery. Refrigerate leftovers and reheat thoroughly.</p>
                </Accordion>
                <Accordion title="Delivery & returns">
                  <p>Delivered in 25–35 minutes. Delivery is free on orders above {cur}{settings.freeDeliveryThreshold}; otherwise a {cur}{settings.deliveryFee} fee applies. If anything is wrong with your order, contact us and we'll make it right.</p>
                </Accordion>
              </div>
            </div>
          </div>

          {crossSells.length > 0 && (
            <section className="pv-section">
              <Reveal className="section-head">
                <div>
                  <div className="section-eyebrow">Pairs well with</div>
                  <h2 className="section-title">Complete your <em>meal</em></h2>
                </div>
              </Reveal>
              <div className="pv-grid">
                {crossSells.map((f, i) => <Fooditem key={f._id} item={f} index={i} />)}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="pv-section" id="reviews">
            <Reveal className="section-head center">
              <span className="section-tag">Reviews</span>
              <h2 className="section-title">What customers are saying</h2>
            </Reveal>

            <div className="pv-reviews-bar">
              <div className="pv-score">
                <strong>{reviewCount ? avgRating.toFixed(1) : '–'}</strong>
                <div><Stars value={reviewCount ? avgRating : 0} /><span>{reviewCount} verified review{reviewCount === 1 ? '' : 's'}</span></div>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="pv-no-reviews">No reviews yet. Order this dish and be the first to share your thoughts.</p>
            ) : (
              <div className="pv-review-grid">
                {reviews.map((r, i) => (
                  <Reveal key={r._id} className="pv-review" delay={(i % 3) * 0.08}>
                    <Stars value={r.rating} size={15} />
                    {r.title && <h4>{r.title}</h4>}
                    <p>“{r.comment}”</p>
                    <div className="pv-review-user">
                      <span className="pv-review-avatar">{r.userName?.[0]?.toUpperCase() || 'U'}</span>
                      <div>
                        <strong>{r.userName}</strong>
                        <small>{r.isVerifiedPurchase ? 'Verified buyer · ' : ''}{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}

            <div className="pv-review-form card">
              <h3>{userReview ? 'Update your review' : 'Write a review'}</h3>
              {!token ? (
                <div className="pv-review-note">
                  <span>Sign in and order this dish to leave a verified review.</span>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>Sign in</button>
                </div>
              ) : !canReview ? (
                <div className="pv-review-note locked"><Icon name="lock" size={16} />Only customers who have ordered and paid for this dish can review it.</div>
              ) : (
                <form onSubmit={handleReviewSubmit}>
                  {userReview && <div className="pv-review-info">You've reviewed this dish before — editing sends it for approval again.</div>}
                  <div className="field">
                    <label>Your rating</label>
                    <div className="pv-star-pick">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button type="button" key={s} className={ratingInput >= s ? 'on' : ''} onClick={() => setRatingInput(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`}>
                          <Icon name="star" size={26} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="rv-title">Headline (optional)</label>
                    <input id="rv-title" className="input" placeholder="e.g. Delicious and still hot!" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="rv-body">Your review</label>
                    <textarea id="rv-body" className="input" rows={4} required placeholder="How did it taste? Portion size, packaging, delivery…" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} />
                  </div>
                  {reviewMsg && <div className="pv-msg ok"><Icon name="check" size={16} />{reviewMsg}</div>}
                  {reviewError && <div className="pv-msg err">{reviewError}</div>}
                  <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                    {submittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          </section>

          {related.length > 0 && (
            <section className="pv-section">
              <Reveal className="section-head">
                <div>
                  <div className="section-eyebrow">More from {catLabel(food.category)}</div>
                  <h2 className="section-title">You may also <em>like</em></h2>
                </div>
              </Reveal>
              <div className="pv-grid">
                {related.map((f, i) => <Fooditem key={f._id} item={f} index={i} />)}
              </div>
            </section>
          )}
        </>
      )}

      {toast && <div className="pv-toast" role="status"><Icon name="check" size={18} />{toast}</div>}
    </div>
  );
};

export default Productview;
