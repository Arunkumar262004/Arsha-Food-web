import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg, imageSrc } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { PageHead, Empty, ConfirmDialog, Segmented } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Reviews.css";

const Reviews = () => {
  const { can } = useAuth();
  const manage = can("products.update") || true;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending"); // pending, approved, rejected, all
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadReviews = async () => {
    try {
      const res = await api.get("/api/reviews/admin/list");
      if (res.data.success) {
        setReviews(res.data.data || []);
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to load reviews"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    document.title = "Customer Reviews · Inofex Restaurant Admin";
  }, []);

  const updateStatus = async (reviewId, status) => {
    try {
      const res = await api.put(`/api/reviews/admin/${reviewId}/status`, { status });
      if (res.data.success) {
        toast.success(res.data.message);
        setReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? { ...r, status } : r))
        );
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to update review status"));
    }
  };

  const removeReview = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await api.delete(`/api/reviews/admin/${deleting._id}`);
      if (res.data.success) {
        toast.success("Review deleted");
        setReviews((prev) => prev.filter((r) => r._id !== deleting._id));
        setDeleting(null);
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete review"));
    } finally {
      setBusy(false);
    }
  };

  const filtered = reviews.filter((r) => (tab === "all" ? true : r.status === tab));

  const counts = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    all: reviews.length,
  };

  return (
    <div className="page rv-page">
      <PageHead
        crumbs={["Catalog", "Reviews"]}
        title="Customer Product Reviews"
        sub="Moderate customer feedback & verified buyer ratings before they appear on product pages."
      />

      <div className="rv-stats">
        <div className="card rv-stat">
          <span>Pending Approval</span>
          <strong style={{ color: "#d97706" }}>{counts.pending}</strong>
        </div>
        <div className="card rv-stat">
          <span>Approved & Published</span>
          <strong style={{ color: "#16a34a" }}>{counts.approved}</strong>
        </div>
        <div className="card rv-stat">
          <span>Rejected</span>
          <strong style={{ color: "#dc2626" }}>{counts.rejected}</strong>
        </div>
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 12 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "pending", label: `Pending (${counts.pending})` },
              { value: "approved", label: `Approved (${counts.approved})` },
              { value: "rejected", label: `Rejected (${counts.rejected})` },
              { value: "all", label: `All (${counts.all})` },
            ]}
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating & Review</th>
                <th>Submitted</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="skeleton" style={{ height: 44 }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty title="No reviews found">
                      {tab === "pending"
                        ? "There are no pending customer reviews to moderate."
                        : "No reviews match this filter."}
                    </Empty>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 200 }}>
                        {r.product?.image && (
                          <img
                            src={imageSrc(r.product.image)}
                            alt=""
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }}
                          />
                        )}
                        <div>
                          <strong>{r.product?.name || "Dish"}</strong>
                          <div className="muted" style={{ fontSize: 12 }}>{r.product?.category}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{r.userName}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>{r.userEmail}</div>
                        {r.isVerifiedPurchase && (
                          <div className="rv-user-badge">
                            ✓ Verified Buyer
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div className="rv-star-rating">
                        {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                      </div>
                      {r.title && <strong style={{ display: "block", fontSize: 13, marginTop: 4 }}>{r.title}</strong>}
                      <p style={{ fontSize: 13, margin: "4px 0 0", color: "var(--text-muted, #475569)" }}>{r.comment}</p>
                    </td>
                    <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {dateTime(r.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === "approved"
                            ? "badge-green"
                            : r.status === "rejected"
                            ? "badge-red"
                            : "badge-amber"
                        }`}
                      >
                        {r.status === "approved"
                          ? "Approved"
                          : r.status === "rejected"
                          ? "Rejected"
                          : "Pending Approval"}
                      </span>
                    </td>
                    <td className="right" style={{ whiteSpace: "nowrap" }}>
                      {manage && (
                        <>
                          {r.status !== "approved" && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#16a34a", marginRight: 4 }}
                              onClick={() => updateStatus(r._id, "approved")}
                              title="Approve and Publish on Product Page"
                            >
                              <Icon name="check" size={15} /> Approve
                            </button>
                          )}
                          {r.status !== "rejected" && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#dc2626", marginRight: 4 }}
                              onClick={() => updateStatus(r._id, "rejected")}
                              title="Reject Review"
                            >
                              <Icon name="close" size={15} /> Reject
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setDeleting(r)}
                            title="Delete Review"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          danger
          busy={busy}
          title="Delete Review?"
          confirmLabel="Delete"
          message={`Are you sure you want to delete the review by ${deleting.userName}?`}
          onConfirm={removeReview}
          onClose={() => !busy && setDeleting(null)}
        />
      )}
    </div>
  );
};

export default Reviews;
