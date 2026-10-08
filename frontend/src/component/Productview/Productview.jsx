import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';

const Productview = () => {
  const { cartItems, removeItemFromCart, addToCart, imageSrc, url, token, setShowLogin, publicCoupons } = useContext(StoreContext);
  const { id } = useParams();
  const [foodId, setFoodid] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const navigate = useNavigate();

  // Review states
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [avgRating, setAvgRating] = useState('5.0');
  const [reviewCount, setReviewCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Scroll to top immediately when product page opens or id changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const fetch_food_id = async () => {
      try {
        const response = await axios.get(`${url}/api/food/getid/${id}`);
        if (isMounted && response.data?.dataid) {
          setFoodid(response.data.dataid);
          setActiveImgIndex(0);
          document.title = `${response.data.dataid.name} — Arsha Food`;
        }
      } catch (err) {
        console.error("Error fetching food:", err);
      }
    };
    fetch_food_id();
    return () => { isMounted = false; };
  }, [id, url]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${url}/api/reviews/product/${id}`);
      if (res.data.success) {
        setApprovedReviews(res.data.data || []);
        setAvgRating(res.data.averageRating || '5.0');
        setReviewCount(res.data.totalReviews || 0);
      }
    } catch (err) {
      console.error("Error fetching reviews", err);
    }
  };

  const checkPurchaseEligible = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${url}/api/reviews/check-purchase/${id}`, {
        headers: { token }
      });
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
      console.error("Error checking review eligibility", err);
    }
  };

  useEffect(() => {
    fetchReviews();
    checkPurchaseEligible();
  }, [id, token, url]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setShowLogin(true);
      return;
    }
    setSubmittingReview(true);
    setReviewMsg('');
    setReviewError('');
    try {
      const res = await axios.post(
        `${url}/api/reviews/add`,
        { productId: id, rating: ratingInput, title: titleInput, comment: commentInput },
        { headers: { token } }
      );
      if (res.data.success) {
        setReviewMsg(res.data.message || 'Review submitted for admin approval!');
        checkPurchaseEligible();
      } else {
        setReviewError(res.data.message || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const qty = cartItems[id] || 0;
  const currentQty = qty === 0 ? 1 : qty;

  const allImages = foodId?.images?.length ? foodId.images : (foodId?.image ? [foodId.image] : []);

  const handleAddToCart = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    const added = addToCart(id);
    if (added !== false) {
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    if (qty === 0) {
      addToCart(id);
    }
    navigate(`/place_single_order/${id}`);
  };

  return (
    <>
      <style>{`
        .pv-page {
          min-height: 80vh;
          background: linear-gradient(180deg, var(--bg, #fffaf5) 0%, #fdf6ee 100%);
          padding: 32px 24px 80px;
        }

        .pv-breadcrumb {
          max-width: 1080px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--ink-3, #a08a7c);
        }
        .pv-breadcrumb a {
          color: var(--ink-2, #6b5446);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .pv-breadcrumb a:hover {
          color: var(--brand, #f26b1d);
        }
        .pv-breadcrumb span.sep { color: var(--line, #f1e4d8); font-size: 16px; }

        /* CARD CONTAINER */
        .pv-card {
          max-width: 1080px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 4px 20px rgba(43, 26, 16, 0.04), 0 16px 48px rgba(43, 26, 16, 0.08);
          border: 1px solid var(--line, #f1e4d8);
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(320px, 440px) 1fr;
          position: relative;
        }

        /* LEFT IMAGE CONTAINER */
        .pv-img-side {
          position: relative;
          background: linear-gradient(135deg, #fff5eb 0%, #ffe9da 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 36px 28px;
          min-height: 420px;
          overflow: hidden;
          gap: 16px;
        }

        .pv-img-glow {
          position: absolute;
          width: 240px;
          height: 240px;
          background: rgba(242, 107, 29, 0.18);
          filter: blur(50px);
          border-radius: 50%;
        }

        .pv-img-side img.pv-main-img {
          width: 100%;
          max-width: 100%;
          max-height: 320px;
          object-fit: cover;
          border-radius: 22px;
          box-shadow: 0 16px 40px rgba(43, 26, 16, 0.15);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
          position: relative;
          z-index: 1;
        }

        .pv-img-side:hover img.pv-main-img {
          transform: scale(1.02);
        }

        .pv-img-badge {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 3;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          color: var(--brand-dark, #d9560c);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          border: 1px solid rgba(242, 107, 29, 0.15);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* THUMBNAILS ROW FOR N IMAGES */
        .pv-thumbs-row {
          display: flex;
          gap: 10px;
          z-index: 2;
          overflow-x: auto;
          max-width: 100%;
          padding: 4px;
        }

        .pv-thumb-btn {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          border: 2px solid transparent;
          overflow: hidden;
          cursor: pointer;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.2s ease;
          padding: 0;
          flex-shrink: 0;
        }

        .pv-thumb-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pv-thumb-btn.active {
          border-color: #f26b1d;
          transform: scale(1.08);
          box-shadow: 0 4px 14px rgba(242, 107, 29, 0.35);
        }

        /* RIGHT INFO SIDE */
        .pv-info {
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }

        .pv-category {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--brand-soft, #ffe9da);
          color: var(--brand-dark, #d9560c);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 999px;
          width: fit-content;
          margin-bottom: 12px;
        }

        .pv-name {
          font-size: clamp(26px, 2.5vw, 34px);
          font-weight: 800;
          color: var(--ink, #2b1a10);
          line-height: 1.2;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .pv-desc {
          font-size: 15px;
          color: var(--ink-2, #6b5446);
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .pv-ratings {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .pv-stars {
          display: flex;
          gap: 3px;
          color: #f59e0b;
          font-size: 16px;
        }
        .pv-rating-badge {
          background: #fef3c7;
          color: #92400e;
          font-weight: 700;
          font-size: 13px;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .pv-rating-count {
          font-size: 13px;
          color: var(--ink-3, #a08a7c);
        }

        /* PRICE SECTION */
        .pv-price-wrapper {
          background: var(--bg, #fffaf5);
          border: 1px solid var(--line, #f1e4d8);
          border-radius: 18px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pv-price-left {
          display: flex;
          flex-direction: column;
        }

        .pv-price-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-3, #a08a7c);
          font-weight: 600;
        }

        .pv-price-num {
          font-size: 34px;
          font-weight: 800;
          color: var(--ink, #2b1a10);
          line-height: 1.1;
        }

        .pv-delivery-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--green, #1f9d61);
          font-weight: 600;
          background: var(--green-soft, #e3f6ec);
          padding: 6px 12px;
          border-radius: 999px;
        }

        /* COUPONS SECTION ON PRODUCT PAGE */
        .pv-coupons-box {
          background: #fff8f0;
          border: 1.5px dashed #f26b1d;
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 20px;
        }
        .pv-coupons-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: #d9560c;
          margin-bottom: 10px;
        }
        .pv-coupons-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pv-coupon-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #f1e4d8;
          border-radius: 12px;
          padding: 10px 14px;
          gap: 12px;
        }
        .pv-coupon-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pv-coupon-code {
          font-size: 13px;
          font-weight: 800;
          color: #f26b1d;
          letter-spacing: 0.05em;
          background: #ffe9da;
          padding: 2px 8px;
          border-radius: 6px;
          width: fit-content;
        }
        .pv-coupon-desc {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
        }
        .pv-coupon-copy {
          background: #f26b1d;
          color: #ffffff;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .pv-coupon-copy:hover {
          background: #d9560c;
        }

        /* QUANTITY CONTROLLER */
        .pv-qty-section {
          margin-bottom: 24px;
        }
        .pv-qty-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink-2, #6b5446);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pv-qty-title span.total-calc {
          color: var(--brand, #f26b1d);
          text-transform: none;
          font-size: 14px;
          font-weight: 800;
        }

        .pv-stepper-box {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pv-stepper {
          display: inline-flex;
          align-items: center;
          height: 46px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid var(--line, #f1e4d8);
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .pv-stepper-btn {
          width: 46px;
          height: 46px;
          border: 0;
          background: transparent;
          color: var(--ink, #2b1a10);
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-weight: 700;
          transition: background 0.15s, color 0.15s;
        }
        .pv-stepper-btn:hover:not(:disabled) {
          background: var(--brand-soft, #ffe9da);
          color: var(--brand, #f26b1d);
        }
        .pv-stepper-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .pv-stepper-val {
          min-width: 36px;
          text-align: center;
          font-weight: 800;
          font-size: 17px;
          color: var(--ink, #2b1a10);
        }

        .pv-in-cart-badge {
          font-size: 13px;
          font-weight: 600;
          color: var(--green, #1f9d61);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ACTIONS */
        .pv-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .pv-btn-cart {
          height: 52px;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          border: 2px solid var(--brand, #f26b1d);
          background: #ffffff;
          color: var(--brand, #f26b1d);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s ease;
        }
        .pv-btn-cart:hover {
          background: var(--brand-soft, #ffe9da);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(242, 107, 29, 0.2);
        }

        .pv-btn-buy {
          height: 52px;
          border-radius: 999px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, var(--brand, #f26b1d) 0%, var(--brand-dark, #d9560c) 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 6px 20px rgba(242, 107, 29, 0.35);
          transition: all 0.2s ease;
        }
        .pv-btn-buy:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(242, 107, 29, 0.45);
        }

        /* TRUST ITEMS */
        .pv-trust-bar {
          display: flex;
          align-items: center;
          gap: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--line, #f1e4d8);
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .pv-trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-2, #6b5446);
          font-weight: 500;
        }
        .pv-trust-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--green-soft, #e3f6ec);
          color: var(--green, #1f9d61);
          display: grid;
          place-items: center;
          font-size: 12px;
        }

        /* REVIEWS SECTION BELOW PRODUCT CARD */
        .pv-reviews-section {
          max-width: 1080px;
          margin: 32px auto 0;
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 4px 20px rgba(43, 26, 16, 0.04);
          border: 1px solid var(--line, #f1e4d8);
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .pv-reviews-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--line, #f1e4d8);
          padding-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .pv-reviews-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--ink, #2b1a10);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pv-reviews-score-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff8f0;
          border: 1px solid #ffd4b8;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          color: #d9560c;
        }

        .pv-review-form-card {
          background: var(--bg, #fffaf5);
          border: 1.5px dashed var(--brand-soft, #ffd4b8);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pv-star-selector {
          display: flex;
          gap: 6px;
        }

        .pv-star-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #cbd5e1;
          cursor: pointer;
          transition: color 0.15s, transform 0.15s;
        }

        .pv-star-btn.selected {
          color: #f59e0b;
          transform: scale(1.1);
        }

        .pv-review-input {
          height: 42px;
          border-radius: 10px;
          border: 1.5px solid var(--line, #f1e4d8);
          padding: 0 14px;
          font-size: 14px;
          outline: none;
          background: #ffffff;
        }

        .pv-review-textarea {
          border-radius: 10px;
          border: 1.5px solid var(--line, #f1e4d8);
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          background: #ffffff;
          resize: vertical;
        }

        .pv-review-submit-btn {
          height: 44px;
          border-radius: 999px;
          border: none;
          background: var(--brand, #f26b1d);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
          width: fit-content;
          padding: 0 24px;
        }

        .pv-review-submit-btn:hover:not(:disabled) {
          background: var(--brand-dark, #d9560c);
        }

        .pv-reviews-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pv-review-card {
          background: #ffffff;
          border: 1px solid var(--line, #f1e4d8);
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pv-review-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pv-review-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--brand-soft, #ffe9da);
          color: var(--brand-dark, #d9560c);
          font-weight: 800;
          display: grid;
          place-items: center;
          font-size: 14px;
        }

        .pv-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          background: #eefcf4;
          color: #15803d;
          padding: 2px 8px;
          border-radius: 999px;
        }

        /* TOAST */
        .pv-toast {
          position: fixed;
          bottom: 32px;
          right: 32px;
          background: var(--ink, #2b1a10);
          color: #ffffff;
          padding: 14px 24px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 12px 36px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1000;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* SKELETON */
        .pv-skeleton {
          max-width: 1080px;
          margin: 0 auto;
          background: white;
          border-radius: 28px;
          padding: 44px;
          display: grid;
          grid-template-columns: 440px 1fr;
          gap: 44px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        @media (max-width: 960px) {
          .pv-card, .pv-skeleton { grid-template-columns: 1fr; }
          .pv-img-side { min-height: 320px; padding: 32px; }
          .pv-info { padding: 32px 24px; }
          .pv-actions { grid-template-columns: 1fr; }
          .pv-reviews-section { padding: 24px 18px; }
        }
      `}</style>

      <div className="pv-page">
        {/* Breadcrumb Navigation */}
        <nav className="pv-breadcrumb">
          <Link to="/">Home</Link>
          <span className="sep">›</span>
          <Link to="/#menu">Menu</Link>
          <span className="sep">›</span>
          <span style={{ color: 'var(--ink, #2b1a10)', fontWeight: 600 }}>{foodId?.name || 'Loading dish...'}</span>
        </nav>

        {foodId ? (
          <>
            <div className="pv-card">
              {/* Left Image Section */}
              <div className="pv-img-side">
                <div className="pv-img-glow"></div>
                <div className="pv-img-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Chef's Special
                </div>
                <img
                  className="pv-main-img"
                  src={imageSrc(allImages[activeImgIndex] || foodId.image)}
                  alt={foodId.name}
                  onLoad={() => setImgLoaded(true)}
                  style={{ opacity: imgLoaded ? 1 : 0.8 }}
                />

                {/* 5-8 Product Image Gallery Thumbnails */}
                {allImages.length > 1 && (
                  <div className="pv-thumbs-row">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`pv-thumb-btn ${activeImgIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveImgIndex(idx)}
                      >
                        <img src={imageSrc(img)} alt={`Angle ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Information Section */}
              <div className="pv-info">
                <div>
                  <div className="pv-category">{foodId.category}</div>
                  <h1 className="pv-name">{foodId.name}</h1>
                  <p className="pv-desc">{foodId.description}</p>

                  {/* Rating & Reviews */}
                  <div className="pv-ratings">
                    <div className="pv-stars">★★★★★</div>
                    <span className="pv-rating-badge">{avgRating} ★</span>
                    <span className="pv-rating-count">· {reviewCount} verified customer review{reviewCount === 1 ? '' : 's'}</span>
                  </div>

                  {/* Price Block */}
                  <div className="pv-price-wrapper">
                    <div className="pv-price-left">
                      <span className="pv-price-label">Price per portion</span>
                      <span className="pv-price-num">₹{foodId.price}</span>
                    </div>
                    <div className="pv-delivery-tag">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      25-35 mins
                    </div>
                  </div>

                  {/* Available Offers & Coupons Section */}
                  <div className="pv-coupons-box">
                    <div className="pv-coupons-title">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      <span>Available Offers & Coupons</span>
                    </div>
                    <div className="pv-coupons-list">
                      {publicCoupons && publicCoupons.length > 0 ? (
                        publicCoupons.map((c) => (
                          <div key={c._id || c.code} className="pv-coupon-item">
                            <div className="pv-coupon-left">
                              <span className="pv-coupon-code">{c.code}</span>
                              <span className="pv-coupon-desc">
                                {c.type === "percentage" ? `${c.value}% OFF${c.maxDiscount ? ` (Max ₹${c.maxDiscount})` : ''}` : c.type === "fixed" ? `₹${c.value} OFF` : "Free Delivery"}
                                {c.minOrderAmount ? ` · Min order ₹${c.minOrderAmount}` : ''}
                              </span>
                            </div>
                            <button
                              className="pv-coupon-copy"
                              onClick={() => {
                                navigator.clipboard.writeText(c.code);
                                setCopiedCode(c.code);
                                setTimeout(() => setCopiedCode(null), 2500);
                              }}
                            >
                              {copiedCode === c.code ? 'Copied ✓' : 'Copy Code'}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="pv-coupon-item">
                          <div className="pv-coupon-left">
                            <span className="pv-coupon-code">ARSHA10</span>
                            <span className="pv-coupon-desc">Get 10% OFF on all orders above ₹199!</span>
                          </div>
                          <button
                            className="pv-coupon-copy"
                            onClick={() => {
                              navigator.clipboard.writeText("ARSHA10");
                              setCopiedCode("ARSHA10");
                              setTimeout(() => setCopiedCode(null), 2500);
                            }}
                          >
                            {copiedCode === "ARSHA10" ? 'Copied ✓' : 'Copy Code'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="pv-qty-section">
                    <div className="pv-qty-title">
                      <span>Select Quantity</span>
                      <span className="total-calc">Total: ₹{foodId.price * currentQty}</span>
                    </div>
                    <div className="pv-stepper-box">
                      <div className="pv-stepper">
                        <button
                          className="pv-stepper-btn"
                          onClick={() => removeItemFromCart(id)}
                          disabled={qty === 0}
                          aria-label="Decrease quantity"
                        >−</button>
                        <span className="pv-stepper-val">{qty === 0 ? 1 : qty}</span>
                        <button
                          className="pv-stepper-btn"
                          onClick={() => {
                            if (!token) {
                              setShowLogin(true);
                              return;
                            }
                            addToCart(id);
                          }}
                          aria-label="Increase quantity"
                        >+</button>
                      </div>

                      {qty > 0 && (
                        <span className="pv-in-cart-badge">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          {qty} in your cart
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div>
                  <div className="pv-actions">
                    <button className="pv-btn-cart" onClick={handleAddToCart}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                      {qty > 0 ? 'Add More to Cart' : 'Add to Cart'}
                    </button>

                    <button className="pv-btn-buy" onClick={handleBuyNow}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      Buy Now
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pv-trust-bar">
                    <div className="pv-trust-item">
                      <div className="pv-trust-icon">✓</div>
                      <span>Fresh & Hot</span>
                    </div>
                    <div className="pv-trust-item">
                      <div className="pv-trust-icon">✓</div>
                      <span>100% Safe Packaging</span>
                    </div>
                    <div className="pv-trust-item">
                      <div className="pv-trust-icon">✓</div>
                      <span>Hygienic Kitchen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER REVIEWS & VERIFIED BUYER WRITE-A-REVIEW SECTION */}
            <div className="pv-reviews-section">
              <div className="pv-reviews-header">
                <div className="pv-reviews-title">
                  <span>Customer Reviews</span>
                </div>
                <div className="pv-reviews-score-badge">
                  <span>★ {avgRating} out of 5</span>
                  <span>({reviewCount} Approved Review{reviewCount === 1 ? '' : 's'})</span>
                </div>
              </div>

              {/* Write a Review Section for Verified Buyers */}
              <div className="pv-review-form-card">
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink, #2b1a10)' }}>
                  Write a Customer Review
                </h4>

                {!token ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: '#64748b' }}>
                      Sign in and purchase this dish to write a verified customer review.
                    </span>
                    <button
                      type="button"
                      className="pv-review-submit-btn"
                      onClick={() => setShowLogin(true)}
                    >
                      Sign In to Review
                    </button>
                  </div>
                ) : !canReview ? (
                  <div style={{ background: '#fef3c7', color: '#92400e', padding: '12px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🔒</span>
                    <span>Verified Purchase Required: Only customers who have ordered and paid for this dish can submit a review.</span>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {userReview && (
                      <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                        ℹ️ You have previously submitted a review for this dish. Editing will resubmit it for admin approval.
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Your Rating
                      </label>
                      <div className="pv-star-selector">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`pv-star-btn ${ratingInput >= star ? 'selected' : ''}`}
                            onClick={() => setRatingInput(star)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Review Headline (Optional)
                      </label>
                      <input
                        type="text"
                        className="pv-review-input"
                        placeholder="e.g. Delicious & Hot!"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: 6 }}>
                        Detailed Review
                      </label>
                      <textarea
                        className="pv-review-textarea"
                        rows={3}
                        required
                        placeholder="Tell others how this dish tasted, portion size, and presentation..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    {reviewMsg && (
                      <div style={{ background: '#eefcf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                        ✓ {reviewMsg}
                      </div>
                    )}

                    {reviewError && (
                      <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                        ⚠️ {reviewError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="pv-review-submit-btn"
                      disabled={submittingReview}
                    >
                      {submittingReview ? 'Submitting…' : 'Submit Review for Approval'}
                    </button>
                  </form>
                )}
              </div>

              {/* Approved Reviews List */}
              <div className="pv-reviews-grid">
                {approvedReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 14 }}>
                    No approved customer reviews yet. Be the first verified buyer to share your feedback!
                  </div>
                ) : (
                  approvedReviews.map((rev) => (
                    <div key={rev._id} className="pv-review-card">
                      <div className="pv-review-card-top">
                        <div className="pv-review-user">
                          <div className="pv-review-avatar">
                            {rev.userName ? rev.userName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <strong style={{ fontSize: 14, color: 'var(--ink, #2b1a10)' }}>{rev.userName}</strong>
                            {rev.isVerifiedPurchase && (
                              <span className="pv-verified-badge" style={{ marginLeft: 8 }}>
                                ✓ Verified Buyer
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ color: '#f59e0b', fontSize: 15 }}>
                          {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                        </div>
                      </div>

                      {rev.title && (
                        <h5 style={{ margin: '4px 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ink, #2b1a10)' }}>
                          {rev.title}
                        </h5>
                      )}

                      <p style={{ margin: 0, fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
                        {rev.comment}
                      </p>

                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                        Reviewed on {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="pv-skeleton">
            <div className="skeleton" style={{ height: 380, borderRadius: 20 }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="skeleton" style={{ height: 24, width: '30%', borderRadius: 999 }}></div>
              <div className="skeleton" style={{ height: 40, width: '75%', borderRadius: 12 }}></div>
              <div className="skeleton" style={{ height: 60, borderRadius: 12 }}></div>
              <div className="skeleton" style={{ height: 80, borderRadius: 18 }}></div>
              <div className="skeleton" style={{ height: 52, borderRadius: 999, marginTop: 12 }}></div>
            </div>
          </div>
        )}
      </div>

      {addedToast && (
        <div className="pv-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          Added {foodId?.name} to your cart!
        </div>
      )}
    </>
  );
};

export default Productview;