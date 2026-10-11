// Sidebar structure. Items are hidden when the admin lacks the permission.
export const NAV = [
  {
    section: null, items: [
      { to: "/dashboard", label: "Dashboard", icon: "dashboard", perm: "dashboard.view" },
      { to: "/reports", label: "Reports", icon: "chart", perm: "reports.view" },
    ],
  },
  {
    section: "Sales", items: [
      { to: "/orders", label: "Orders", icon: "bag", perm: "orders.view" },
      { to: "/payments", label: "Payments", icon: "card", perm: "payments.view" },
      { to: "/customers", label: "Customers", icon: "users", perm: "customers.view" },
    ],
  },
  {
    section: "Catalog", items: [
      { to: "/products", label: "Products", icon: "box", perm: "products.view" },
      { to: "/categories", label: "Categories", icon: "grid", perm: "products.view" },
      { to: "/inventory", label: "Inventory", icon: "stock", perm: "products.view" },
      { to: "/reviews", label: "Reviews", icon: "star", perm: "products.view" },
    ],
  },
  {
    section: "Marketing", items: [
      { to: "/sales", label: "Festival Sales", icon: "gift", perm: "coupons.view" },
      { to: "/coupons", label: "Coupons", icon: "tag", perm: "coupons.view" },
      { to: "/banners", label: "Home Banners", icon: "image", perm: "content.view" },
      { to: "/subscribers", label: "Subscribers", icon: "send", perm: "customers.view" },
      { to: "/emails", label: "Emails", icon: "mail", perm: "notifications.view" },
    ],
  },
  {
    section: "Administration", items: [
      { to: "/settings", label: "Settings", icon: "settings" },
      { to: "/admins", label: "Admin Users", icon: "users", perm: "admins.view" },
      { to: "/roles", label: "Roles", icon: "shield", perm: "roles.view" },
      { to: "/audit-logs", label: "Audit Logs", icon: "history", perm: "audit.view" },
    ],
  },
];
