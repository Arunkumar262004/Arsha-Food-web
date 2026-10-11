// Menu order for "Recommended" sorting. Starts as the built-in order (set by categories.js) and is
// replaced by admin → Categories once the store loads them.
let order = {};
export const getCategoryRank = (name) => order[name] ?? 999;
export const setCategoryOrder = (names) => {
  if (names?.length) order = Object.fromEntries(names.map((n, i) => [n, i]));
};
