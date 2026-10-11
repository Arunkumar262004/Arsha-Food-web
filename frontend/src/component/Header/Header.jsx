import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { dishPath } from '../../config/store';
import { CartControl } from '../Fooditem/Fooditem';
import { SpinBadge } from '../Motion';
import Icon from '../Icon';
import biryani from '../../assets/hero/biryani.webp';
import shake from '../../assets/hero/shake.webp';
import burger from '../../assets/hero/burger.webp';
import sundae from '../../assets/hero/sundae.webp';
import cake from '../../assets/hero/cake.webp';
import './Header.css';

// Shown until the admin publishes banners (admin → Marketing → Home Banners).
const DEFAULT_SLIDES = [
  { tag: "Chef's special", title: 'Royal *dum* biryani', subtitle: 'Aged basmati, tender meat and whole spices, sealed in a handi and slow-cooked on dum.', bgColor: '#b8322a', image: biryani },
  { tag: 'Fresh strawberries', title: 'Strawberry *milkshake*', subtitle: 'Ripe strawberries blended with chilled milk and vanilla ice cream — thick, cold and creamy.', bgColor: '#c9475f', image: shake },
  { tag: 'Stacked to order', title: 'Classic *cheese* burger', subtitle: 'Juicy grilled patty, melted cheddar, crisp lettuce, tomato and our house sauce in a sesame bun.', bgColor: '#e3a12b', image: burger },
  { tag: 'Sweet endings', title: 'Brownie *Oreo* sundae', subtitle: 'Warm brownie, vanilla ice cream, hot fudge and crushed Oreos, layered high in a glass.', bgColor: '#5b3418', image: sundae },
  { tag: 'Baked fresh daily', title: 'Raspberry *cream* cake', subtitle: 'Soft vanilla sponge layered with fresh cream and raspberries, topped with whole berries.', bgColor: '#2f6b3a', image: cake },
].map((s) => ({ ...s, ctaLabel: 'Order now', ctaLink: '/#menu', bigText: 'ARSHA', imageStyle: 'cutout', builtIn: true }));

const DURATION = 6500;

// "Royal *dum* biryani" → words, with the starred ones highlighted.
const words = (title) => String(title || '').split('*').flatMap((part, i) =>
  part.split(/\s+/).filter(Boolean).map((text) => ({ text, hi: i % 2 === 1 })));

// A light background needs dark text; work it out from the colour's luminance.
const isLight = (hex) => {
  const n = parseInt((hex || '#000000').slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
};

const CtaLink = ({ to, className, children }) =>
  /^https?:\/\//i.test(to)
    ? <a href={to} className={className} target="_blank" rel="noreferrer">{children}</a>
    : <Link to={to || '/#menu'} className={className}>{children}</Link>;

const Header = () => {
  const { url, imageSrc, settings } = useContext(StoreContext);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState(1); // 1 = next slide enters from the right, -1 = from the left
  const touchX = React.useRef(null);

  useEffect(() => {
    let alive = true;
    axios.get(`${url}/api/banners`)
      .then((r) => { if (alive && r.data?.data?.length) { setSlides(r.data.data); setIndex(0); } })
      .catch(() => {}); // keep the built-in slides
    return () => { alive = false; };
  }, [url]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => { setDir(1); setIndex((i) => (i + 1) % slides.length); }, DURATION);
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  const slide = slides[index] || slides[0];
  const go = (d) => { setDir(d); setIndex((i) => (i + d + slides.length) % slides.length); };
  const goTo = (i) => { if (i !== index) { setDir(i > index ? 1 : -1); setIndex(i); } };
  // Position of each image relative to the current slide, so the strip slides in the travel direction.
  const place = (i) => (i === index ? 'active' : (dir > 0 ? (i === (index - 1 + slides.length) % slides.length ? 'left' : 'right') : (i === (index + 1) % slides.length ? 'right' : 'left')));
  const src = (s) => (s.builtIn ? s.image : imageSrc(s.image, 1000));
  const light = isLight(slide.bgColor);
  const food = slide.food && typeof slide.food === 'object' ? slide.food : null;

  return (
    <section className={`hero ${light ? 'is-light' : ''}`} style={{ '--hero-bg': slide.bgColor }}
      aria-roledescription="carousel" aria-label="Featured dishes" data-dir={dir > 0 ? 'next' : 'prev'}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}>
      <div className="hero-glow" />
      <div className="hero-grain" />
      {slide.bigText && <div className="hero-bigtext" key={`big-${index}`} aria-hidden="true">{slide.bigText}</div>}

      <div className="container hero-inner">
        {/* key re-mounts the copy so the entrance animation replays on each slide */}
        <div className="hero-copy" key={`copy-${index}`}>
          {slide.tag && <span className="hero-tag"><Icon name="sparkle" size={14} />{slide.tag}</span>}
          <h1 className="hero-title">
            {words(slide.title).map((w, i) => (
              <React.Fragment key={i}>
                <span className={`split-word ${w.hi ? 'hi' : ''}`}><span style={{ '--d': `${0.1 + i * 0.07}s` }}>{w.text}</span></span>{' '}
              </React.Fragment>
            ))}
          </h1>
          {slide.subtitle && <p className="hero-sub">{slide.subtitle}</p>}
          <div className="hero-ctas">
            <CtaLink to={slide.ctaLink} className="btn btn-lg hero-cta">{slide.ctaLabel || 'Order now'}<Icon name="arrowRight" size={18} /></CtaLink>
            {slide.secondaryLabel && slide.secondaryLink && (
              <CtaLink to={slide.secondaryLink} className="btn btn-lg hero-cta-2">{slide.secondaryLabel}</CtaLink>
            )}
          </div>
          {food && (
            <div className="hero-dish">
              <Link to={dishPath(food)} className="hero-dish-name">{food.name}</Link>
              <strong>{settings.currencySymbol}{food.price}</strong>
              <CartControl id={food._id} name={food.name} />
            </div>
          )}
        </div>

        <div className={`hero-art ${slide.imageStyle === 'photo' ? 'is-photo' : ''}`}>
          <div className="hero-plate" />
          <SpinBadge text="FRESH • HOT • HANDMADE • FRESH • HOT • HANDMADE • " size={118} className="hero-badge">
            <Icon name="flame" size={30} />
          </SpinBadge>
          {slides.map((s, i) => (
            <img key={s._id || i} src={src(s)} alt={i === index ? s.title.replace(/\*/g, '') : ''}
              className={`hero-img ${place(i)}`}
              // A missing banner image shows nothing rather than the browser's broken-image icon and alt text.
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} aria-hidden={i !== index}
              loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} />
          ))}
        </div>

        {slides.length > 1 && (
          <div className="hero-controls" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
            <button onClick={() => go(-1)} aria-label="Previous slide"><Icon name="arrowLeft" size={18} /></button>
            <div className="hero-dots">
              {slides.map((s, i) => (
                <button key={s._id || i} className={i === index ? 'active' : ''} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} aria-current={i === index}>
                  {i === index && <span style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
                </button>
              ))}
            </div>
            <button onClick={() => go(1)} aria-label="Next slide"><Icon name="arrowRight" size={18} /></button>
            <span className="hero-count"><strong>{String(index + 1).padStart(2, '0')}</strong> / {String(slides.length).padStart(2, '0')}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default Header;
