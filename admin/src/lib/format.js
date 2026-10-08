const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("en-IN");

export const money = (n) => inr.format(Number(n) || 0);
export const moneyShort = (n) => (Math.abs(n) >= 100000 ? inrCompact.format(n) : money(n));
export const number = (n) => int.format(Number(n) || 0);

export const dateTime = (d) => d ? new Date(d).toLocaleString("en-IN", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}) : "—";

export const dateShort = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const timeAgo = (d) => {
  if (!d) return "never";
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(d);
};

// Bucket keys from the API: "YYYY-MM-DD HH" | "YYYY-MM-DD" | "YYYY-MM"
export const bucketLabel = (key, unit) => {
  if (unit === "hour") return `${key.slice(11, 13)}:00`;
  if (unit === "month") return new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
