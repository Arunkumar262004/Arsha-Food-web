import { jsPDF } from "jspdf";
import logoUrl from "../assets/logo.png";

const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// Money with at most two decimals: 12.9 → "12.90", 129 → "129".
const money = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

/**
 * High-Resolution Client-Side Invoice PDF Generator
 * Renders a clean, official A4 Tax Invoice document and triggers direct PDF file download.
 */
export const downloadInvoicePDF = async (order, settings = {}) => {
  const sym = settings.currencySymbol || "₹";
  const orderNumber = order.orderNumber || `#${(order._id || "").slice(-6).toUpperCase()}`;
  const fileName = `Invoice_${orderNumber.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;

  // Create high-res A4 canvas (1240 x 1754 px at 150 DPI)
  const canvas = document.createElement("canvas");
  const width = 1240;
  const height = 1754;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Top Header Banner
  ctx.fillStyle = "#7a4a21";
  ctx.fillRect(0, 0, width, 140);

  // Brand Title
  // Logo on a white rounded badge
  const logo = await loadImage(logoUrl);
  let brandX = 60;
  if (logo) {
    const bh = 96, bw = Math.round(bh * 1.6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(60, 22, bw, bh, 18); else ctx.rect(60, 22, bw, bh);
    ctx.fill();
    const scale = Math.min((bw - 24) / logo.width, (bh - 16) / logo.height);
    const lw = logo.width * scale, lh = logo.height * scale;
    ctx.drawImage(logo, 60 + (bw - lw) / 2, 22 + (bh - lh) / 2, lw, lh);
    brandX = 60 + bw + 26;
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px 'Barlow', 'Outfit', sans-serif";
  ctx.fillText("INOFEX RESTAURANT", brandX, 65);

  ctx.fillStyle = "#ebd7be";
  ctx.font = "500 18px sans-serif";
  ctx.fillText("Fresh & Hygienic Gourmet Food Delivery", brandX, 100);

  // Tax Invoice Tag (Top Right)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("OFFICIAL TAX INVOICE", width - 60, 65);

  ctx.fillStyle = "#f7ebd9";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(orderNumber, width - 60, 100);
  ctx.textAlign = "left";

  // Order Meta Bar
  ctx.fillStyle = "#fcf8f4";
  ctx.fillRect(60, 170, width - 120, 70);
  ctx.strokeStyle = "#e8ecf4";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 170, width - 120, 70);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 16px sans-serif";
  ctx.fillText("DATE & TIME", 90, 200);
  ctx.fillText("PAYMENT METHOD", 440, 200);
  ctx.fillText("PAYMENT STATUS", 820, 200);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px sans-serif";
  const dateStr = new Date(order.date || Date.now()).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  ctx.fillText(dateStr, 90, 226);
  ctx.fillText(order.paymentMethod === "razorpay" ? "Razorpay (Online)" : order.paymentMethod || "Razorpay", 440, 226);

  ctx.fillStyle = order.payment ? "#16a34a" : "#dc2626";
  ctx.fillText(order.payment ? "PAID ✓" : "PENDING", 820, 226);

  // Customer & Delivery Address Grid
  const boxWidth = (width - 150) / 2;
  
  // Box 1: Customer Info
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(60, 270, boxWidth, 140);
  ctx.strokeStyle = "#e8ecf4";
  ctx.strokeRect(60, 270, boxWidth, 140);

  ctx.fillStyle = "#7a4a21";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("CUSTOMER DETAILS", 80, 298);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px sans-serif";
  const custName = [order.address?.firstName, order.address?.lastName].filter(Boolean).join(" ") || "Customer";
  ctx.fillText(custName, 80, 330);

  ctx.fillStyle = "#475569";
  ctx.font = "500 16px sans-serif";
  ctx.fillText(`Email: ${order.address?.email || "N/A"}`, 80, 360);
  ctx.fillText(`Phone: ${order.address?.phone || "N/A"}`, 80, 388);

  // Box 2: Delivery Address
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(80 + boxWidth, 270, boxWidth, 140);
  ctx.strokeRect(80 + boxWidth, 270, boxWidth, 140);

  ctx.fillStyle = "#7a4a21";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("DELIVERY ADDRESS", 100 + boxWidth, 298);

  ctx.fillStyle = "#1e293b";
  ctx.font = "500 16px sans-serif";
  const addrStr = [order.address?.street, order.address?.city, order.address?.state, order.address?.zipcode, order.address?.country].filter(Boolean).join(", ") || "Standard Delivery Address";
  
  // Wrap address text
  const words = addrStr.split(" ");
  let line = "";
  let lineY = 330;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > boxWidth - 40 && n > 0) {
      ctx.fillText(line, 100 + boxWidth, lineY);
      line = words[n] + " ";
      lineY += 26;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 100 + boxWidth, lineY);

  // Itemized Table Header
  const tableTop = 440;
  ctx.fillStyle = "#7a4a21";
  ctx.fillRect(60, tableTop, width - 120, 50);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("DISH ITEM DESCRIPTION", 80, tableTop + 32);
  ctx.textAlign = "center";
  ctx.fillText("QTY", 720, tableTop + 32);
  ctx.textAlign = "right";
  ctx.fillText("UNIT PRICE", 940, tableTop + 32);
  ctx.fillText("LINE TOTAL", width - 80, tableTop + 32);

  // Itemized Table Rows
  let y = tableTop + 50;
  const items = order.items || [];
  ctx.font = "500 17px sans-serif";

  items.forEach((item, index) => {
    ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#fcf8f4";
    ctx.fillRect(60, y, width - 120, 56);
    ctx.strokeStyle = "#f1e4d8";
    ctx.strokeRect(60, y, width - 120, 56);

    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "left";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(item.name || "Dish Item", 80, y + 34);

    ctx.textAlign = "center";
    ctx.font = "600 17px sans-serif";
    ctx.fillText(String(item.quantity || 1), 720, y + 34);

    ctx.textAlign = "right";
    ctx.font = "500 17px sans-serif";
    ctx.fillText(`${sym}${money(item.price)}`, 940, y + 34);
    
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(`${sym}${money((item.price || 0) * (item.quantity || 1))}`, width - 80, y + 34);

    y += 56;
  });

  // Financial Breakdown Box (Bottom Right)
  const summaryTop = y + 30;
  const summaryWidth = 460;
  const summaryX = width - 60 - summaryWidth;

  ctx.fillStyle = "#fcf8f4";
  ctx.fillRect(summaryX, summaryTop, summaryWidth, 200);
  ctx.strokeStyle = "#e8ecf4";
  ctx.strokeRect(summaryX, summaryTop, summaryWidth, 200);

  let sumY = summaryTop + 40;
  ctx.font = "600 17px sans-serif";
  
  if (order.subtotal !== undefined) {
    ctx.fillStyle = "#475569";
    ctx.textAlign = "left";
    ctx.fillText("Items Subtotal", summaryX + 30, sumY);
    ctx.textAlign = "right";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(`${sym}${money(order.subtotal)}`, width - 90, sumY);
    sumY += 34;
  }

  if (order.discount > 0) {
    ctx.fillStyle = "#16a34a";
    ctx.textAlign = "left";
    ctx.fillText(`Coupon Discount (${order.couponCode || "COUPON"})`, summaryX + 30, sumY);
    ctx.textAlign = "right";
    ctx.fillText(`-${sym}${money(order.discount)}`, width - 90, sumY);
    sumY += 34;
  }

  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  ctx.fillText("Delivery Fee", summaryX + 30, sumY);
  ctx.textAlign = "right";
  ctx.fillStyle = order.deliveryFee === 0 ? "#16a34a" : "#1e293b";
  ctx.fillText(order.deliveryFee === 0 ? "FREE" : `${sym}${money(order.deliveryFee ?? 40)}`, width - 90, sumY);
  sumY += 40;

  // Grand Total Line
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(summaryX + 20, sumY - 14);
  ctx.lineTo(width - 80, sumY - 14);
  ctx.stroke();

  ctx.fillStyle = "#7a4a21";
  ctx.textAlign = "left";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Grand Total", summaryX + 30, sumY + 10);
  ctx.textAlign = "right";
  ctx.fillText(`${sym}${money(order.amount)}`, width - 90, sumY + 10);

  // Footer Note & Stamp
  const footerY = height - 120;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(60, footerY, width - 120, 2);

  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.font = "500 15px sans-serif";
  ctx.fillText("Thank you for dining with Inofex Restaurant! This is an electronically generated invoice.", width / 2, footerY + 36);
  ctx.fillText("For support or inquiries, email admin@store.com · 100% Encrypted & Secure Transaction", width / 2, footerY + 64);

  // Save as genuine PDF file using jsPDF
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF("p", "mm", "a4");
  pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
  pdf.save(fileName);
};
