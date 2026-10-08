// Sidebar structure — add modules here as later phases land. Items are hidden without permission.
export const NAV = [
  { section: null, items: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard", perm: "dashboard.view" }] },
  {
    section: "Catalog", items: [
      { to: "/products", label: "Products", icon: "box", perm: "products.view", end: true },
      { to: "/products/new", label: "Add Product", icon: "plus", perm: "products.create" },
      { to: "/reviews", label: "Customer Reviews", icon: "star", perm: "products.view" },
    ],
  },
  { section: "Sales", items: [{ to: "/orders", label: "Orders", icon: "bag", perm: "orders.view" }] },
  { section: "Marketing", items: [{ to: "/coupons", label: "Coupons", icon: "tag", perm: "coupons.view" }] },
  {
    section: "Notifications", items: [
      { to: "/emails", label: "Email Templates", icon: "template", perm: "notifications.view", end: true },
      { to: "/emails/log", label: "Email Log", icon: "mail", perm: "notifications.view" },
    ],
  },
  {
    section: "Administration", items: [
      { to: "/settings", label: "Delivery & Settings", icon: "settings" },
      { to: "/admins", label: "Admin Users", icon: "users", perm: "admins.view" },
      { to: "/roles", label: "Roles & Permissions", icon: "shield", perm: "roles.view" },
      { to: "/audit-logs", label: "Audit Logs", icon: "history", perm: "audit.view" },
    ],
  },
];

