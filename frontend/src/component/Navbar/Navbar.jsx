import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { StoreContext } from '../../context/Storecontext'
import { assets } from '../../assets/assets'
import { whatsappLink } from '../../config/store'
import Icon from '../Icon'
import './Navbar.css'

const Navbar = () => {
  const { cartCount, token, user, imageSrc, logout, setShowLogin, food_list, settings } = useContext(StoreContext)
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Over the home hero the bar is transparent; everywhere else (or once scrolled) it is solid.
  const overlay = location.pathname === '/' && !scrolled && !menuOpen

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); setSearchOpen(false) }, [location.pathname, location.hash])
  useEffect(() => { setQ(params.get('q') || '') }, [params])
  useEffect(() => { if (searchOpen) inputRef.current?.focus() }, [searchOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    const onDoc = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') { setSearchOpen(false); setProfileOpen(false) } }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const search = (e) => {
    e.preventDefault()
    const term = q.trim()
    setSearchOpen(false)
    navigate(term ? `/?q=${encodeURIComponent(term)}#menu` : '/#menu')
  }

  const signOut = () => { logout(); navigate('/') }

  const suggestions = useMemo(() => {
    if (!food_list?.length) return []
    const term = q.trim().toLowerCase()
    if (!term) return food_list.slice(0, 6)
    return food_list.filter((f) =>
      f.name.toLowerCase().includes(term) || f.category?.toLowerCase().includes(term) || f.description?.toLowerCase().includes(term)
    ).slice(0, 6)
  }, [food_list, q])

  const initials = user?.name ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : 'U'

  return (
    <header className={`nav ${overlay ? 'is-overlay' : 'is-solid'}`}>
      <div className="container nav-inner">
        <button className="nav-burger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>

        <Link to="/" className="nav-logo" aria-label="Arsha home">
          <span className="nav-logo-mark"><img src={assets.logo} alt="Arsha" /></span>
        </Link>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => (isActive && !location.hash ? 'active' : '')}>Home</NavLink>
          <Link to="/#menu" className={location.hash === '#menu' ? 'active' : ''}>Menu</Link>
          <Link to="/#categories" className={location.hash === '#categories' ? 'active' : ''}>Categories</Link>
          <Link to="/#offers" className={location.hash === '#offers' ? 'active' : ''}>Offers</Link>
          {token && <NavLink to="/myorders">My orders</NavLink>}
          <Link to={`${location.pathname}#footer`}>Contact</Link>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="nav-wa-mobile"><Icon name="whatsapp" size={18} />Order on WhatsApp</a>
        </nav>

        <div className="nav-actions">
          <div className="nav-search" ref={searchRef}>
            <button className="nav-icon" onClick={() => setSearchOpen((o) => !o)} aria-label="Search dishes" aria-expanded={searchOpen}>
              <Icon name="search" size={22} />
            </button>

            {searchOpen && (
              <div className="nav-search-pop" role="dialog" aria-label="Search">
                <form onSubmit={search} role="search" className="nav-search-form">
                  <Icon name="search" size={18} />
                  <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes, coffee, cakes…" aria-label="Search dishes" />
                  <button type="submit" className="btn btn-primary btn-sm">Search</button>
                </form>
                <div className="nav-search-label">{q.trim() ? 'Matching dishes' : 'Popular right now'}</div>
                {suggestions.length === 0 ? (
                  <div className="nav-search-empty">No dishes match “{q}”. Try another word.</div>
                ) : (
                  <div className="nav-search-grid">
                    {suggestions.map((f) => (
                      <button key={f._id} className="nav-search-item" onClick={() => { setSearchOpen(false); navigate(`/viewproduct/${f._id}`) }}>
                        <img src={imageSrc(f.image, 120)} alt="" />
                        <span>
                          <strong>{f.name}</strong>
                          <small>{settings.currencySymbol}{f.price} · {f.category}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link to="/cart" className="nav-icon" aria-label={`Cart, ${cartCount} items`}>
            <Icon name="bag" size={22} />
            {cartCount > 0 && <span className="nav-count">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>

          {!token ? (
            <button className="nav-icon" onClick={() => setShowLogin(true)} aria-label="Sign in">
              <Icon name="user" size={22} />
            </button>
          ) : (
            <div className="nav-profile" ref={profileRef}>
              <button className="nav-avatar-btn" onClick={() => setProfileOpen((o) => !o)} aria-label="Account" aria-expanded={profileOpen}>
                {user?.avatar ? <img src={imageSrc(user.avatar)} alt="" /> : <span>{initials}</span>}
              </button>
              {profileOpen && (
                <div className="nav-dropdown" role="menu">
                  {user && (
                    <div className="nav-user-header">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  )}
                  <button role="menuitem" onClick={() => navigate('/profile')}><Icon name="user" size={18} />My profile</button>
                  <button role="menuitem" onClick={() => navigate('/myorders')}><Icon name="receipt" size={18} />My orders</button>
                  <button role="menuitem" onClick={signOut} className="danger"><Icon name="logout" size={18} />Sign out</button>
                </div>
              )}
            </div>
          )}

          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="nav-wa">
            <Icon name="whatsapp" size={20} />Order on WhatsApp
          </a>
        </div>
      </div>
    </header>
  )
}

export default Navbar
