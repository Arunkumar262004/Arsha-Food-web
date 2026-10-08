import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Myorder.css';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { assets } from '../../assets/assets';

const Myorder = () => {
    const navigate = useNavigate();
    const { url, token, settings, imageSrc, food_list, setShowLogin } = useContext(StoreContext);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Review form state map: { [productId]: { rating: 5, title: '', comment: '', submitting: false, msg: '', error: '' } }
    const [reviewsState, setReviewsState] = useState({});

    const fetchOrders = async () => {
        try {
            const response = await axios.post(url + "/api/order/userorders", {}, { headers: { token } });
            const list = response.data.data || [];
            setData(list);
            if (selectedOrder) {
                const refreshed = list.find(o => o._id === selectedOrder._id);
                if (refreshed) setSelectedOrder(refreshed);
            }
        } catch (err) {
            console.error("Error fetching user orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchOrders();
        }
    }, [token]);

    useEffect(() => {
        document.title = "My Orders — Arsha Food";
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, []);

    const getProductImage = (item) => {
        if (item?.image) {
            return imageSrc(item.image);
        }
        const found = food_list.find((f) => f._id === (item?._id || item?.id) || f.name?.toLowerCase() === item?.name?.toLowerCase());
        if (found?.image) {
            return imageSrc(found.image);
        }
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
                rating: 5,
                title: '',
                comment: '',
                submitting: false,
                msg: '',
                error: '',
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

    const isDelivered = (order) => {
        return (order?.status || "").toLowerCase().includes("delivered");
    };

    return (
        <div className='my-orders-page container'>
            <div className="my-orders-header">
                <h2>My Orders & Tracking</h2>
                <p>Track your live food orders, view printable invoices, and review your delivered meals.</p>
            </div>

            {loading ? (
                <div className="orders-loading-grid">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="skeleton" style={{ height: 100, borderRadius: 18 }} />
                    ))}
                </div>
            ) : data.length === 0 ? (
                <div className="card empty-orders-card">
                    <div className="empty-icon">📦</div>
                    <h3>No orders yet</h3>
                    <p>Looks like you haven't placed any delicious food orders yet.</p>
                </div>
            ) : (
                <div className="orders-list">
                    {data.map((order, index) => {
                        const mainItem = order.items?.[0];
                        const mainImgSrc = getProductImage(mainItem);

                        return (
                            <div key={order._id || index} className="order-card">
                                {/* PRODUCT IMAGE SECTION */}
                                <div className="order-img-wrapper" onClick={() => navigate(`/myorders/${order._id}`)} style={{ cursor: 'pointer' }}>
                                    <img
                                        src={mainImgSrc}
                                        alt={mainItem?.name || "Food dish"}
                                        className="order-product-img"
                                        onError={(e) => { e.target.src = assets.parcel_icon; }}
                                    />
                                    {order.items?.length > 1 && (
                                        <span className="order-more-count">+{order.items.length - 1} more</span>
                                    )}
                                </div>

                                {/* ORDER DETAILS */}
                                <div className="order-details" onClick={() => navigate(`/myorders/${order._id}`)} style={{ cursor: 'pointer' }}>
                                    <div className="order-items-text">
                                        {order.items.map((item, idx) => (
                                            <span key={idx} className="order-item-chip">
                                                <strong>{item.name}</strong> × {item.quantity}
                                                {idx < order.items.length - 1 ? " · " : ""}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="order-meta-info">
                                        <span>Items: <strong>{order.items.reduce((s, i) => s + (i.quantity || 1), 0)}</strong></span>
                                        {order.orderNumber && <span className="order-num-tag">{order.orderNumber}</span>}
                                        <span style={{ fontSize: 12 }}>{new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {/* AMOUNT */}
                                <div className="order-amount-box" onClick={() => navigate(`/myorders/${order._id}`)} style={{ cursor: 'pointer' }}>
                                    <span className="amount-label">Total Amount</span>
                                    <span className="amount-value">{settings.currencySymbol}{order.amount}</span>
                                </div>

                                {/* STATUS BADGE */}
                                <div className="order-status-box" onClick={() => navigate(`/myorders/${order._id}`)} style={{ cursor: 'pointer' }}>
                                    <span className={`status-pill ${getStatusBadgeClass(order.status)}`}>
                                        <span className="status-dot"></span>
                                        {order.status}
                                    </span>
                                </div>

                                {/* ACTIONS */}
                                <div className="order-action-box" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <button className="track-btn" onClick={() => navigate(`/myorders/${order._id}`)}>
                                        🧾 Invoice & Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Myorder;

