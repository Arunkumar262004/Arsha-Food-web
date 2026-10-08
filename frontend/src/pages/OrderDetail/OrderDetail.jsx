import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../context/Storecontext';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';
import { assets } from '../../assets/assets';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { url, token, settings, imageSrc, food_list, setShowLogin } = useContext(StoreContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewsState, setReviewsState] = useState({});

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = "Order Invoice & Details — Arsha Food";

    if (!token) {
      setShowLogin(true);
      navigate('/myorders');
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await axios.post(`${url}/api/order/userorders`, {}, { headers: { token } });
        const list = response.data.data || [];
        const found = list.find((o) => o._id === id || o.orderNumber === id);
        if (found) {
          setOrder(found);
          document.title = `Order ${found.orderNumber || id} — Arsha Food`;
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, token, url, navigate, setShowLogin]);

  const getProductImage = (item) => {
    if (item?.image) return imageSrc(item.image);
    const found = food_list.find((f) => f._id === (item?._id || item?.id) || f.name?.toLowerCase() === item?.name?.toLowerCase());
    if (found?.image) return imageSrc(found.image);
    return assets.parcel_icon;
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("delivered")) return "status-green";
    if (s.includes("delivery") || s.includes("out")) return "status-orange";
    if (s.includes("pending")) return "status-amber";
    if (s.includes("cancel") || s.includes("failed")) return "status-red";
    return "status-blue";
  };

  const handleReviewChange = (productId, field, value) => {
    setReviewsState(prev => ({
      ...prev,
      [productId]: {
        rating: 5, title: '', comment: '', submitting: false, msg: '', error: '',
        ...(prev[productId] || {}),
        [field]: value
      }
    }));
  };

  const submitDishReview = async (productId, e) => {
    e.preventDefault();
    if (!token) {
      setShowLogin(true);
      return;
    }
    const current = reviewsState[productId] || { rating: 5, title: '', comment: '' };
    if (!current.comment?.trim()) {
      handleReviewChange(productId, 'error', 'Please write a brief comment.');
      return;
    }

    handleReviewChange(productId, 'submitting', true);
    handleReviewChange(productId, 'msg', '');
    handleReviewChange(productId, 'error', '');

    try {
      const res = await axios.post(
        `${url}/api/reviews/add`,
        { productId, rating: current.rating || 5, title: current.title || '', comment: current.comment.trim() },
        { headers: { token } }
      );

      if (res.data.success) {
        handleReviewChange(productId, 'msg', res.data.message || 'Review submitted for admin approval!');
      } else {
        handleReviewChange(productId, 'error', res.data.message || 'Could not submit review');
      }
    } catch (err) {
      handleReviewChange(productId, 'error', err.response?.data?.message || 'Error submitting review');
    } finally {
      handleReviewChange(productId, 'submitting', false);
    }
  };

  const isDelivered = (order?.status || "").toLowerCase().includes("delivered");

  return (
    <div className="container" style={{ padding: '32px 0 80px', minHeight: '80vh', fontFamily: "'Outfit', sans-serif" }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#94a3b8', marginBottom: 24, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
        <span>›</span>
        <Link to="/myorders" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>My Orders</Link>
        <span>›</span>
        <span style={{ color: '#1e293b', fontWeight: 700 }}>{order?.orderNumber || id}</span>
      </nav>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 180, borderRadius: 24 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 24 }} />
        </div>
      ) : !order ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 24, border: '1px solid #f1e4d8' }}>
          <h2>Order Not Found</h2>
          <p style={{ color: '#64748b' }}>We could not locate this order details page.</p>
          <button className="track-btn" onClick={() => navigate('/myorders')} style={{ width: 'fit-content', margin: '16px auto 0' }}>
            ← Back to My Orders
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* HEADER CARD */}
          <div style={{ background: '#ffffff', border: '1px solid #f1e4d8', borderRadius: 24, padding: '28px 32px', boxShadow: '0 4px 20px rgba(43,26,16,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                  <span className="status-dot"></span>
                  {order.status}
                </span>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {new Date(order.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Order {order.orderNumber || `#${order._id.slice(-6).toUpperCase()}`}
              </h1>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => downloadInvoicePDF(order, settings)}
                style={{
                  background: 'linear-gradient(135deg, #7a4a21 0%, #543216 100%)',
                  color: '#ffffff',
                  border: 'none',
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(122,74,33,0.35)'
                }}
              >
                📥 Download PDF Invoice
              </button>

              <button
                type="button"
                onClick={() => navigate('/myorders')}
                style={{
                  background: '#ffffff',
                  color: '#7a4a21',
                  border: '1.5px solid #7a4a21',
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                ← Back to Orders
              </button>
            </div>
          </div>

          {/* CUSTOMER & DELIVERY INFO GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <div style={{ background: '#ffffff', border: '1px solid #f1e4d8', borderRadius: 20, padding: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#7a4a21', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Customer Information
              </label>
              <strong style={{ fontSize: 16, color: '#1e293b', display: 'block' }}>
                {[order.address?.firstName, order.address?.lastName].filter(Boolean).join(" ") || "Customer"}
              </strong>
              <div style={{ fontSize: 13.5, color: '#475569', marginTop: 4 }}>📧 {order.address?.email || "N/A"}</div>
              <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>📞 {order.address?.phone || "N/A"}</div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #f1e4d8', borderRadius: 20, padding: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#7a4a21', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Delivery Address
              </label>
              <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                {[order.address?.street, order.address?.city, order.address?.state, order.address?.zipcode, order.address?.country].filter(Boolean).join(", ") || "Standard Delivery"}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #f1e4d8', borderRadius: 20, padding: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#7a4a21', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Payment Information
              </label>
              <div style={{ fontSize: 13.5, color: '#334155' }}>
                Method: <strong>{order.paymentMethod === "razorpay" ? "Razorpay (Online)" : order.paymentMethod || "Razorpay"}</strong>
              </div>
              <div style={{ fontSize: 13.5, color: '#334155', marginTop: 4 }}>
                Status: <span style={{ fontWeight: 800, color: order.payment ? "#16a34a" : "#dc2626" }}>{order.payment ? "PAID ✓" : "PENDING"}</span>
              </div>
              {order.razorpayPaymentId && (
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', marginTop: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
                  ID: {order.razorpayPaymentId}
                </div>
              )}
            </div>
          </div>

          {/* ITEMIZED DISHES TABLE */}
          <div style={{ background: '#ffffff', border: '1px solid #f1e4d8', borderRadius: 24, padding: 28, boxShadow: '0 4px 20px rgba(43,26,16,0.04)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
              Ordered Items ({order.items.length})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#fcf8f4', borderBottom: '1px solid #f1e4d8' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Dish Item</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>Qty</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Price</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1e4d8' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <img src={getProductImage(item)} alt="" style={{ width: 54, height: 54, borderRadius: 12, objectFit: 'cover' }} />
                          <div>
                            <strong style={{ fontSize: 15, color: '#1e293b' }}>{item.name}</strong>
                            {item.category && <div style={{ fontSize: 12, color: '#64748b' }}>{item.category}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{item.quantity}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>{settings.currencySymbol}{item.price}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>
                        {settings.currencySymbol}{(item.price || 0) * (item.quantity || 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FINANCIAL BREAKDOWN */}
            <div style={{ maxWidth: 360, marginLeft: 'auto', marginTop: 24, background: '#fcf8f4', border: '1px solid #f1e4d8', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {order.subtotal !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, color: '#475569' }}>
                  <span>Items Subtotal</span>
                  <span>{settings.currencySymbol}{order.subtotal}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, color: '#16a34a', fontWeight: 600 }}>
                  <span>Coupon Discount ({order.couponCode})</span>
                  <span>-{settings.currencySymbol}{order.discount}</span>
                </div>
              )}
              {order.deliveryFee !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, color: '#475569' }}>
                  <span>Delivery Charge</span>
                  <span>{order.deliveryFee === 0 ? <strong style={{ color: '#16a34a' }}>FREE</strong> : `${settings.currencySymbol}${order.deliveryFee}`}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                <span>Grand Total</span>
                <span>{settings.currencySymbol}{order.amount}</span>
              </div>
            </div>
          </div>

          {/* DELIVERED ORDER DISH REVIEWS SECTION */}
          {isDelivered ? (
            <div className="mo-delivered-reviews-box" style={{ background: '#ffffff' }}>
              <div className="mo-reviews-head">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Delivered Order — Rate & Review Your Dishes</h3>
              </div>
              <p className="mo-reviews-sub">Your feedback is verified as an official buyer review before displaying on dish pages.</p>

              <div className="mo-dishes-review-list">
                {order.items.map((item) => {
                  const pId = item._id || item.id;
                  const rState = reviewsState[pId] || { rating: 5, title: '', comment: '', submitting: false, msg: '', error: '' };

                  return (
                    <div key={pId} className="mo-dish-review-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <img src={getProductImage(item)} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
                        <div>
                          <strong style={{ fontSize: 16, color: '#1e293b' }}>{item.name}</strong>
                          <div style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 600 }}>✓ Delivered Verified Purchase</div>
                        </div>
                      </div>

                      <form onSubmit={(e) => submitDishReview(pId, e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rating</label>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: rState.rating >= star ? '#f59e0b' : '#cbd5e1' }}
                                onClick={() => handleReviewChange(pId, 'rating', star)}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Review headline (e.g. Fresh & Delicious!)"
                          value={rState.title}
                          onChange={(e) => handleReviewChange(pId, 'title', e.target.value)}
                          className="mo-review-input"
                        />

                        <textarea
                          rows={3}
                          placeholder="How did this dish taste? Share details for other customers..."
                          value={rState.comment}
                          onChange={(e) => handleReviewChange(pId, 'comment', e.target.value)}
                          className="mo-review-textarea"
                          required
                        />

                        {rState.msg && (
                          <div style={{ background: '#eefcf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                            ✓ {rState.msg}
                          </div>
                        )}

                        {rState.error && (
                          <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                            ⚠️ {rState.error}
                          </div>
                        )}

                        <button type="submit" className="mo-submit-review-btn" disabled={rState.submitting}>
                          {rState.submitting ? 'Submitting…' : 'Submit Dish Review'}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff8f0', border: '1px solid #fed7aa', padding: '16px 20px', borderRadius: 18, fontSize: 13.5, color: '#9a3412', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🚚</span>
              <span>Customer dish reviews unlock automatically once the delivery status changes to <strong>Delivered</strong>.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
