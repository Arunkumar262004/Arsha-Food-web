import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Shell from './layout/Shell';
import { NAV } from './layout/nav';
import Login from './Login';
import Dashboard from './pages/Dashboard/Dashboard';
import List from './pages/List/List';
import Add from './pages/Add/Add';
import Order from './pages/Order/Order';
import AdminOrderDetail from './pages/Order/AdminOrderDetail';
import Admins from './pages/Admins/Admins';
import Roles from './pages/Roles/Roles';
import AuditLogs from './pages/AuditLogs/AuditLogs';
import Coupons from './pages/Coupons/Coupons';
import Emails from './pages/Emails/Emails';
import Settings from './pages/Settings/Settings';
import Reviews from './pages/Reviews/Reviews';
import Banners from './pages/Banners/Banners';
import { Empty } from './components/ui';

const ROUTES = [
  { path: '/dashboard', element: <Dashboard />, perm: 'dashboard.view' },
  { path: '/products', element: <List />, perm: 'products.view' },
  { path: '/products/new', element: <Add />, perm: 'products.create' },
  { path: '/reviews', element: <Reviews />, perm: 'products.view' },
  { path: '/orders', element: <Order />, perm: 'orders.view' },
  { path: '/orders/:id', element: <AdminOrderDetail />, perm: 'orders.view' },
  { path: '/coupons', element: <Coupons />, perm: 'coupons.view' },
  { path: '/banners', element: <Banners />, perm: 'content.view' },
  { path: '/settings', element: <Settings />, perm: 'dashboard.view' },
  { path: '/emails', element: <Emails />, perm: 'notifications.view' },
  { path: '/emails/log', element: <Emails tab="log" />, perm: 'notifications.view' },
  { path: '/admins', element: <Admins />, perm: 'admins.view' },
  { path: '/roles', element: <Roles />, perm: 'roles.view' },
  { path: '/audit-logs', element: <AuditLogs />, perm: 'audit.view' },
];

const Forbidden = () => (
  <div className="page"><div className="card card-pad">
    <Empty title="You don't have access to this page">Ask a Super Admin to update your role.</Empty>
  </div></div>
);

const App = () => {
  const { admin, loading, can } = useAuth();

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <span className="spinner" style={{ borderColor: 'var(--primary-soft-2)', borderTopColor: 'var(--primary)', width: 28, height: 28 }} />
    </div>;
  }

  const toast = <ToastContainer position="top-right" autoClose={3000} newestOnTop />;

  if (!admin) {
    return <>{toast}<Login /></>;
  }

  // Land on the first page this admin is allowed to see.
  const home = NAV.flatMap((s) => s.items).find((i) => can(i.perm))?.to || '/dashboard';

  return (
    <>
      {toast}
      <Shell>
        <Routes>
          {ROUTES.map((r) => <Route key={r.path} path={r.path} element={can(r.perm) ? r.element : <Forbidden />} />)}
          {/* Old paths from the previous admin */}
          <Route path="/list" element={<Navigate to="/products" replace />} />
          <Route path="/add" element={<Navigate to="/products/new" replace />} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </Shell>
    </>
  );
};

export default App;
