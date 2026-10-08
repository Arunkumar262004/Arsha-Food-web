import React from 'react';
import './Header.css';
import heroCoffeeImg from '../../assets/hero_coffee_cup_big.jpg';

const Header = () => {
  return (
    <section className="coffee-hero-section">
      <div className="coffee-hero-container">
        
        {/* Left Column: Compact Typography & Actions */}
        <div className="coffee-hero-left">
          <div className="coffee-display-title">
            <span className="coffee-title-word">BREWED</span>
            <span className="coffee-title-word">WITH</span>
            <span className="coffee-title-word">CARE</span>
          </div>

          <p className="coffee-hero-sub">
            Savor the layered notes of every roast. From bean to brew, crafted with care in every cup.
          </p>

          <div className="coffee-hero-buttons">
            <a href="#menu" className="coffee-btn-primary">SHOP NOW</a>
            <a href="#menu" className="coffee-btn-secondary">LEARN MORE</a>
          </div>

          <div className="coffee-hero-footer-row">
            {/* SVG QR Code */}
            <div className="coffee-qr-box">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v5h-3v-5zm-3 2h2v3h-2v-3zm-3-2h2v2h-2v-2zm0 3h2v2h-2v-2z" />
              </svg>
            </div>

            <div className="coffee-social-trust">
              <div className="coffee-social-icons">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.65 13.75 5.65c1.08 0 2.22.19 2.22.19v2.44h-1.25c-1.23 0-1.62.77-1.62 1.56V12h2.77l-.44 3h-2.33v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
              <span>Trusted by 10k+ daily brewers</span>
            </div>
          </div>
        </div>

        {/* Right Column: Giant Cup Visual & Vertical Badge */}
        <div className="coffee-hero-right">
          <div className="coffee-badge-vertical">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
            </svg>
            <span className="coffee-vertical-text">Small batch. Big flavor.</span>
          </div>

          <div className="coffee-img-wrapper">
            <img src={heroCoffeeImg} alt="Giant Brewed Gourmet Iced Coffee Cup" className="coffee-hero-img" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default Header;
