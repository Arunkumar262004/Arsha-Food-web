import React, { useContext, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './component/Navbar/Navbar';
import Topbar from './component/Topbar/Topbar';
import Footer from './component/Footer/Footer';
import Home from './pages/Home/home';
import Cart from './pages/Cart/Cart';
import Placeorder from './pages/Placeorder/Placeorder';
import Login_popup from './component/Loginpopup/Login_popup';
import Verify from './pages/Placeorder/Verify/Verify';
import Myorder from './pages/Myorders/Myorder';
import Productview from './component/Productview/Productview.jsx';
import Place_single_order from './pages/place-single-order/place-single-order.jsx';
import OrderDetail from './pages/OrderDetail/OrderDetail.jsx';
import Profile from './pages/Profile/Profile.jsx';
import { StoreContext } from './context/Storecontext';

// Every route change starts at the top of the page; #anchors (e.g. /#menu) scroll to their section.
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      return;
    }
    // Wait a frame so the target section has rendered after navigation.
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [pathname, search, hash]);
  return null;
};

const App = () => {
  const { showLogin } = useContext(StoreContext);
  return (
    <>
      <ScrollToTop />
      {showLogin && <Login_popup />}
      <Topbar />
      <Navbar />
      <main className='page-main'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/order' element={<Placeorder />} />
          <Route path='/verify' element={<Verify />} />
          <Route path='/myorders' element={<Myorder />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/myorders/:id' element={<OrderDetail />} />
          <Route path='/order/:id' element={<OrderDetail />} />
          <Route path='/viewproduct/:id' element={<Productview />} />
          <Route path='/place_single_order/:id' element={<Place_single_order />} />
          <Route path='*' element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;
