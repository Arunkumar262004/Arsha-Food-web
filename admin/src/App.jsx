import React, { useState } from 'react';
import Navbar from './Components/Navbar/Navbar';
import Sidebar from './Components/Sidebar/Sidebar';
import { Routes, Route, Navigate } from 'react-router-dom';
import Order from './pages/Order/Order';
import List from './pages/List/List';
import Add from './pages/Add/Add';
import Login from './Login';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const url = "https://arsha-food-web.onrender.com";

  // Check token from localStorage on first load
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('adminToken')
  );

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  // If not logged in, show only the Login page
  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        <Routes>
          <Route
            path="*"
            element={<Login url={url} setIsAuthenticated={setIsAuthenticated} />}
          />
        </Routes>
      </>
    );
  }

  return (
    <div>
      <ToastContainer />
      <Navbar onLogout={handleLogout} />
      <hr />
      <div className="app-content">
        <Sidebar />
        <Routes>
          <Route path="/add"    element={<Add url={url} />} />
          <Route path="/list"   element={<List url={url} />} />
          <Route path="/orders" element={<Order url={url} />} />
          {/* Redirect root to /add after login */}
          <Route path="*" element={<Navigate to="/add" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;