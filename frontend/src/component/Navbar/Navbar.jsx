import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { StoreContext } from '../../context/Storecontext'
import { assets } from '../../assets/assets'
import Icon from '../Icon'
import './Navbar.css'

const Navbar = () => {
  const { cartCount, token, logout, setShowLogin } = useContext(StoreContext)
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { setMenuOpen(false); setProfileOpen(false) }, [location.pathname, location.hash])
  useEffect(() => { setQ(params.get('q') || '') }, [params])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    const onDoc = (e) => profileRef.current && !profileRef.current.contains(e.target) && setProfileOpen(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mousedown', onDoc)
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onDoc) }
  }, [])

  const search = (e) => {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/?q=${encodeURIComponent(term)}#menu` : '/#menu')
  }

  const signOut = () => { logout(); navigate('/') }

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <button className="nav-burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>

        <Link to="/" className="nav-logo" aria-label="Arsha home">
          <img src={assets.logo} alt="Arsha" />
        </Link>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => (isActive && !location.hash ? 'active' : '')}>Home</NavLink>
          <Link to="/#menu" className={location.hash === '#menu' ? 'active' : ''}>Menu</Link>
          {token && <NavLink to="/myorders">My orders</NavLink>}
          <Link to="/#app-download">Mobile app</Link>
          <Link to={`${location.pathname}#footer`}>Contact</Link>
        </nav>

        <form className="nav-search" onSubmit={search} role="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" aria-label="Search dishes" />
        </form>

        <div className="nav-actions">
          <Link to="/cart" className="nav-icon" aria-label={`Cart, ${cartCount} items`}>
            <Icon name="bag" size={22} />
            {cartCount > 0 && <span className="nav-count">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>

          {!token ? (
            <button className="btn btn-primary btn-sm" onClick={() => setShowLogin(true)}>Sign in</button>
          ) : (
            <div className="nav-profile" ref={profileRef}>
              <button className="nav-icon" onClick={() => setProfileOpen((o) => !o)} aria-label="Account" aria-expanded={profileOpen}>
                <Icon name="user" size={22} />
              </button>
              {profileOpen && (
                <div className="nav-dropdown" role="menu">
                  <button role="menuitem" onClick={() => navigate('/myorders')}><Icon name="receipt" size={18} />My orders</button>
                  <button role="menuitem" onClick={signOut} className="danger"><Icon name="logout" size={18} />Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
