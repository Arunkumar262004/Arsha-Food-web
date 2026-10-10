// Permissions are capabilities defined by the code (an endpoint either checks one or not).
// Roles are data: admins can create roles and assign any combination of these.

export const PERMISSION_GROUPS = {
  Dashboard: ["dashboard.view"],
  Products: ["products.view", "products.create", "products.update", "products.delete"],
  Orders: ["orders.view", "orders.update"],
  Customers: ["customers.view"],
  Payments: ["payments.view"],
  Marketing: ["coupons.view", "coupons.manage"],
  Content: ["content.view", "content.manage"],
  Notifications: ["notifications.view", "notifications.manage"],
  Reports: ["reports.view"],
  Administration: [
    "admins.view", "admins.manage",
    "roles.view", "roles.manage",
    "audit.view",
  ],
};

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

// Default roles seeded on startup. Super Admin always has every permission ("*").
export const DEFAULT_ROLES = [
  { slug: "super-admin", name: "Super Admin", permissions: ["*"] },
  {
    slug: "admin", name: "Admin",
    permissions: ALL_PERMISSIONS.filter(p => !["roles.manage"].includes(p)),
  },
  {
    slug: "manager", name: "Manager",
    permissions: ["dashboard.view", "products.view", "products.create", "products.update",
      "orders.view", "orders.update", "customers.view", "payments.view", "reports.view",
      "coupons.view", "coupons.manage", "notifications.view"],
  },
  {
    slug: "product-manager", name: "Product Manager",
    permissions: ["dashboard.view", "products.view", "products.create", "products.update", "products.delete"],
  },
  {
    slug: "order-manager", name: "Order Manager",
    permissions: ["dashboard.view", "orders.view", "orders.update", "customers.view", "payments.view"],
  },
  {
    slug: "customer-support", name: "Customer Support",
    permissions: ["orders.view", "customers.view", "coupons.view", "notifications.view"],
  },
  {
    slug: "marketing-manager", name: "Marketing Manager",
    permissions: ["dashboard.view", "products.view", "customers.view", "reports.view",
      "coupons.view", "coupons.manage", "notifications.view", "notifications.manage",
      "content.view", "content.manage"],
  },
  {
    slug: "accountant", name: "Accountant",
    permissions: ["dashboard.view", "orders.view", "payments.view", "reports.view", "coupons.view"],
  },
];

export const hasPermission = (granted = [], required) =>
  granted.includes("*") || granted.includes(required);
