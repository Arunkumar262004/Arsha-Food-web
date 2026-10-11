// One colour language for charts and status chips across the admin (matches index.css tokens).
export const CHART = {
  primary: "#7a4a21",   // brand brown — revenue, the main series
  gold: "#d29a4a",      // second series
  green: "#2f8a5a",
  red: "#c8372d",
  plum: "#8a4f6e",
  slate: "#6b5d52",
  grid: "#efe7dc",
  axis: "#a08a7c",
};
export const CHART_TINT = { primary: "#f3e6d3", gold: "#f8ead2", green: "#e3f2ea", red: "#f9e4e1", plum: "#f2e5ec" };

// Order status → colour (charts) and badge class (tables). Keep both in step.
export const STATUS_COLOR = {
  "Payment Pending": "#d29a4a",
  "Food Processing": "#7a4a21",
  "Out for Delivery": "#8a4f6e",
  "Delivered": "#2f8a5a",
  "Cancelled": "#c8372d",
  "Payment Failed": "#e38b80",
};

// Categorical sequence for "top N" charts (categories, products).
export const SERIES_SEQ = ["#7a4a21", "#d29a4a", "#2f8a5a", "#8a4f6e", "#c8372d", "#6b5d52", "#b9825a", "#4f7a8a"];
