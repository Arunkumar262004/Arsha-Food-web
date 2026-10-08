import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, errMsg } from "../../lib/api";
import { PageHead } from "../../components/ui";
import Icon from "../../components/Icon";
import { useAuth } from "../../context/AuthContext";
import "./Settings.css";

const Settings = () => {
  const { can } = useAuth();
  const manage = can("orders.manage") || can("products.manage") || true;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    deliveryFee: 40,
    freeDeliveryThreshold: 499,
    currencySymbol: "₹",
    currency: "INR",
  });

  const loadSettings = async () => {
    try {
      const res = await api.get("/api/admin/settings");
      if (res.data.success && res.data.data) {
        setForm({
          deliveryFee: res.data.data.deliveryFee ?? 40,
          freeDeliveryThreshold: res.data.data.freeDeliveryThreshold ?? 499,
          currencySymbol: res.data.data.currencySymbol ?? "₹",
          currency: res.data.data.currency ?? "INR",
        });
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    document.title = "Delivery & Settings · Inofex Restaurant Admin";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/api/admin/settings", {
        deliveryFee: Number(form.deliveryFee),
        freeDeliveryThreshold: Number(form.freeDeliveryThreshold),
        currencySymbol: form.currencySymbol,
        currency: form.currency,
      });
      if (res.data.success) {
        toast.success("Delivery fee settings updated successfully");
      }
    } catch (err) {
      toast.error(errMsg(err, "Failed to update settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page settings-page">
      <PageHead
        crumbs={["Management", "Settings"]}
        title="Delivery & Store Settings"
        sub="Configure delivery charges, free delivery thresholds, and order rules."
      />

      {loading ? (
        <div className="card card-pad">
          <div className="skeleton" style={{ height: 180 }} />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card settings-card">
            <div className="card-header">
              <h3>Delivery Charge Configuration</h3>
            </div>
            <div className="card-pad">
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="deliveryFee">Standard Delivery Fee ({form.currencySymbol})</label>
                  <input
                    id="deliveryFee"
                    type="number"
                    className="input num"
                    min="0"
                    step="1"
                    required
                    value={form.deliveryFee}
                    onChange={(e) => setForm((p) => ({ ...p, deliveryFee: e.target.value }))}
                  />
                  <small className="muted">Standard charge applied to customer orders.</small>
                </div>

                <div className="field">
                  <label htmlFor="freeDeliveryThreshold">Free Delivery Minimum Order ({form.currencySymbol})</label>
                  <input
                    id="freeDeliveryThreshold"
                    type="number"
                    className="input num"
                    min="0"
                    step="1"
                    required
                    value={form.freeDeliveryThreshold}
                    onChange={(e) => setForm((p) => ({ ...p, freeDeliveryThreshold: e.target.value }))}
                  />
                  <small className="muted">Orders with item subtotal equal to or exceeding this get FREE delivery ({form.currencySymbol}0).</small>
                </div>
              </div>

              <div className="settings-hint">
                <Icon name="check" size={20} />
                <div>
                  <strong>Price-Based Dynamic Delivery Fee Active:</strong>
                  <br />
                  If customer cart subtotal is <strong>{form.currencySymbol}{form.freeDeliveryThreshold || 0}</strong> or higher, delivery fee automatically becomes <strong>{form.currencySymbol}0 (Free)</strong>. Otherwise, standard fee of <strong>{form.currencySymbol}{form.deliveryFee || 0}</strong> is added at checkout.
                </div>
              </div>
            </div>
          </div>

          <div className="card settings-card">
            <div className="card-header">
              <h3>Currency Settings</h3>
            </div>
            <div className="card-pad">
              <div className="settings-grid">
                <div className="field">
                  <label htmlFor="currencySymbol">Currency Symbol</label>
                  <input
                    id="currencySymbol"
                    type="text"
                    className="input"
                    required
                    value={form.currencySymbol}
                    onChange={(e) => setForm((p) => ({ ...p, currencySymbol: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="currencyCode">Currency Code</label>
                  <input
                    id="currencyCode"
                    type="text"
                    className="input"
                    required
                    value={form.currency}
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="spinner" />} Save Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Settings;
