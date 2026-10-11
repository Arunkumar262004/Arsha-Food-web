import axios from "axios";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loading = null;
const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!loading) {
    loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = CHECKOUT_SRC;
      s.onload = () => resolve(true);
      s.onerror = () => { loading = null; resolve(false); };
      document.body.appendChild(s);
    });
  }
  return loading;
};

/** Start downloading Razorpay as soon as the checkout page opens, so "Pay" doesn't wait for it. */
export const preloadRazorpay = () => { loadCheckout(); };

/**
 * Opens Razorpay Checkout for an order created by the backend and verifies the result server-side.
 * `checkout` is the backend response ({ orderId, orderNumber, razorpay, prefill }).
 * Resolves "paid" | "dismissed"; rejects with an Error on failure.
 */
export const payWithRazorpay = async ({ url, token, checkout, storeName = "Arsha", onOpen }) => {
  if (!(await loadCheckout())) throw new Error("Could not load Razorpay. Check your connection.");

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, v) => { if (!settled) { settled = true; fn(v); } };

    const rzp = new window.Razorpay({
      key: checkout.razorpay.key,
      order_id: checkout.razorpay.orderId,
      amount: checkout.razorpay.amount,
      currency: checkout.razorpay.currency,
      name: storeName,
      description: `Order ${checkout.orderNumber}`,
      prefill: checkout.prefill,
      // Brand colours for Razorpay's window, its loading spinner and the dimmed page behind it.
      theme: { color: "#7a4a21", backdrop_color: "rgba(29, 18, 11, 0.82)" },
      handler: async (resp) => {
        try {
          const r = await axios.post(url + "/api/order/verify", { orderId: checkout.orderId, ...resp }, { headers: { token } });
          if (r.data.success) finish(resolve, "paid");
          else finish(reject, new Error(r.data.message || "Payment verification failed"));
        } catch (err) {
          finish(reject, new Error(err.response?.data?.message || "Payment verification failed"));
        }
      },
      modal: {
        ondismiss: () => {
          axios.post(url + "/api/order/payment-failed", { orderId: checkout.orderId, reason: "Checkout closed" }, { headers: { token } }).catch(() => {});
          finish(resolve, "dismissed");
        },
      },
    });
    // On a failed attempt Razorpay keeps the modal open so the customer can retry;
    // the order is only marked failed if they close it without paying (ondismiss).
    rzp.open();
    onOpen?.();
  });
};
