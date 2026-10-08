import { createCheckout } from "./Order-controller.js";

// POST /api/placesingle/get_single_order — "Buy now" for a single item
// body: { itemId, quantity?, address }
const Place_single_order = async (req, res) => {
  try {
    const data = await createCheckout({
      userId: req.body.userId,
      lines: [{ id: req.body.itemId, quantity: req.body.quantity || 1 }],
      address: req.body.address,
      source: "single",
      couponCode: req.body.couponCode,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error("Single order error:", error.message);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : "Could not start payment" });
  }
};

export { Place_single_order };
