import React, { useContext, useEffect, useMemo, useState } from 'react';
import { StoreContext } from '../../context/Storecontext';
import { whatsappLink } from '../../config/store';
import { Link } from 'react-router-dom';
import { CartControl, VegMark } from '../Fooditem/Fooditem';
import { catLabel, useCategories, withFallback } from '../Explorermenu/categories';
import { Marquee, Reveal, ScrollText, SpinBadge } from '../Motion';
import Icon from '../Icon';
import heroCoffee from '../../assets/hero_coffee_cup_big.jpg';
import './HomeSections.css';

const goToMenu = () => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* Scrolling word band under the hero */
export const TickerBand = () => {
  const words = ['Fresh salads', 'Hot rolls', 'Slow-baked cakes', 'Creamy pasta', 'Cold brew', 'Wok noodles'];
  return (
    <div className="ticker" aria-hidden="true">
      <Marquee speed={38}>
        {words.map((w) => <span key={w} className="ticker-word">{w}<Icon name="sparkle" size={22} /></span>)}
      </Marquee>
      <Marquee speed={44} reverse className="ticker-outline">
        {words.map((w) => <span key={w} className="ticker-word">{w}<Icon name="sparkle" size={22} /></span>)}
      </Marquee>
    </div>
  );
};

/* Four promises row (FoodHub-style) */
export const FeatureStrip = () => {
  const { settings } = useContext(StoreContext);
  const features = [
    { icon: 'flame', title: 'Cooked to order', text: 'Nothing sits under a heat lamp — every dish is made when you order.' },
    { icon: 'truck', title: 'Free delivery', text: `On every order above ${settings.currencySymbol}${settings.freeDeliveryThreshold}.` },
    { icon: 'shield', title: 'Secure payments', text: 'Pay safely with UPI, cards or net banking.' },
    { icon: 'headset', title: 'Real support', text: 'Chat with our kitchen team on WhatsApp.' },
  ];
  return (
    <section className="container features">
      {features.map((f, i) => (
        <Reveal key={f.title} className="feature" delay={i * 0.08}>
          <span className="feature-icon"><Icon name={f.icon} size={26} /></span>
          <div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        </Reveal>
      ))}
    </section>
  );
};

/* Three coloured offer banners */
export const PromoBanners = ({ Setcategory }) => {
  const { publicCoupons, settings } = useContext(StoreContext);
  const categories = useCategories();
  const byName = (...names) => names.map((n) => categories.find((c) => c.name === n)).find(Boolean);
  const coupon = publicCoupons?.[0];
  const sweet = byName('Deserts', 'Cake');
  const couponText = coupon
    ? coupon.type === 'percentage' ? `${coupon.value}% off` : coupon.type === 'fixed' ? `${settings.currencySymbol}${coupon.value} off` : 'Free delivery on'
    : null;
  const pick = (cat) => { Setcategory(cat); goToMenu(); };

  const banners = [
    coupon && {
      tone: 'brand', kicker: 'Limited time offer', title: `Get ${couponText} your order`,
      text: <>Use code <strong className="promo-code">{coupon.code}</strong>{coupon.minOrderAmount ? ` on orders above ${settings.currencySymbol}${coupon.minOrderAmount}` : ' at checkout'}.</>,
      cta: 'Order now', onClick: goToMenu, img: byName('Burgers & Pizza', 'Snacks')?.photo,
    },
    {
      tone: 'gold', kicker: 'Delivered to your door', title: 'Free delivery, every day',
      text: `No delivery fee on orders above ${settings.currencySymbol}${settings.freeDeliveryThreshold}.`,
      cta: 'Start your order', onClick: goToMenu, img: byName('Biryani', 'Meals')?.photo,
    },
    sweet && {
      tone: 'red', kicker: 'Sweet endings', title: `${sweet.label} to finish your meal`,
      text: 'Sundaes, panna cotta and cakes — made in small batches every day.',
      cta: `Shop ${sweet.label}`, onClick: () => pick(sweet.name), img: sweet.photo,
    },
    !coupon && {
      tone: 'brand', kicker: 'Order your way', title: 'Order straight on WhatsApp',
      text: 'Message our kitchen, we confirm in minutes.', cta: 'Chat with us', href: whatsappLink(), img: heroCoffee,
    },
  ].filter(Boolean);

  return (
    <section className="section container promos" id="offers">
      {banners.map((b, i) => (
        <Reveal key={b.title} className={`promo promo-${b.tone}`} delay={i * 0.1}>
          <div className="promo-copy">
            <span className="promo-kicker">{b.kicker}</span>
            <h3>{b.title}</h3>
            <p>{b.text}</p>
            {b.href
              ? <a href={b.href} target="_blank" rel="noreferrer" className="promo-cta">{b.cta}<Icon name="arrowRight" size={16} /></a>
              : <button className="promo-cta" onClick={b.onClick}>{b.cta}<Icon name="arrowRight" size={16} /></button>}
          </div>
          {b.img && <img className="promo-img" src={b.img} alt="" loading="lazy" />}
        </Reveal>
      ))}
    </section>
  );
};

const useCountdownToMidnight = () => {
  const calc = () => {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((end - now) / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, []);
  return t;
};

/* Today's specials — one featured dish plus a short ranked list, rotating daily, on a dark band */
export const DealOfDay = () => {
  const { food_list, foodLoading, imageSrc, settings } = useContext(StoreContext);
  const [h, m, s] = useCountdownToMidnight();
  const cur = settings.currencySymbol;

  const [featured, ...rest] = useMemo(() => {
    if (!food_list.length) return [];
    // Tagged dishes (Bestseller, Chef's special…) make the best specials; rotate the pool once a day.
    const tagged = food_list.filter((f) => f.tag);
    const pool = tagged.length >= 6 ? tagged : food_list;
    const day = Math.floor(Date.now() / 86400000);
    const start = (day * 5) % pool.length;
    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 5);
  }, [food_list]);

  return (
    <section className="specials">
      <div className="container">
        <Reveal className="specials-head">
          <div>
            <span className="specials-eyebrow"><Icon name="flame" size={16} />Chef's selection</span>
            <h2>Today's <em>specials</em></h2>
            <p>A fresh line-up from our kitchen — the board changes at midnight.</p>
          </div>
          <div className="countdown" role="timer" aria-label={`${h} hours ${m} minutes ${s} seconds left`}>
            {[[h, 'Hrs'], [m, 'Min'], [s, 'Sec']].map(([v, l], i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="countdown-sep">:</span>}
                <span className="countdown-cell"><strong>{String(v).padStart(2, '0')}</strong><small>{l}</small></span>
              </React.Fragment>
            ))}
          </div>
        </Reveal>

        {foodLoading || !featured ? (
          <div className="specials-grid">
            <div className="skeleton specials-skel" />
            <div className="skeleton specials-skel" />
          </div>
        ) : (
          <div className="specials-grid">
            <Reveal className="sp-feature">
              <Link to={`/viewproduct/${featured._id}`} className="sp-feature-img" aria-hidden="true" tabIndex={-1}>
                <img src={imageSrc(featured.image, 1000)} alt="" loading="lazy" />
                <span className="sp-badge">#1 Today</span>
              </Link>
              <div className="sp-feature-body">
                <div className="sp-feature-meta">
                  <VegMark isVeg={featured.isVeg !== false} />
                  <span>{catLabel(featured.category)}</span>
                  {featured.tag && <span className="sp-tag">{featured.tag}</span>}
                </div>
                <Link to={`/viewproduct/${featured._id}`} className="sp-feature-name">{featured.name}</Link>
                <p>{featured.description}</p>
                <div className="sp-feature-foot">
                  <span className="sp-price">{cur}{featured.price}</span>
                  <CartControl id={featured._id} name={featured.name} />
                </div>
              </div>
            </Reveal>

            <ol className="sp-list">
              {rest.map((f, i) => (
                <Reveal as="li" key={f._id} className="sp-row" delay={0.08 * (i + 1)}>
                  <span className="sp-rank">{String(i + 2).padStart(2, '0')}</span>
                  <Link to={`/viewproduct/${f._id}`} className="sp-thumb" tabIndex={-1} aria-hidden="true"><img src={imageSrc(f.image, 220)} alt="" loading="lazy" /></Link>
                  <div className="sp-row-text">
                    <span className="sp-row-meta"><VegMark isVeg={f.isVeg !== false} size={13} />{catLabel(f.category)}</span>
                    <Link to={`/viewproduct/${f._id}`} className="sp-row-name">{f.name}</Link>
                    <span className="sp-row-price">{cur}{f.price}</span>
                  </div>
                  <CartControl id={f._id} name={f.name} />
                </Reveal>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
};

/* Large photo collection cards with a dark caption box (Ghirardelli-style) */
export const Collections = ({ Setcategory }) => {
  const categories = useCategories();
  const preferred = ['Biryani', 'Burgers & Pizza', 'Coffee & Tea'].map((n) => categories.find((c) => c.name === n)).filter(Boolean);
  const top = (preferred.length === 3 ? preferred : [...categories].sort((a, b) => b.count - a.count)).slice(0, 3);
  if (!top.length) return null;
  return (
    <section className="section container collections">
      {top.map((c, i) => (
        <Reveal key={c.name} className="collection" delay={i * 0.1}>
          <img src={c.photo} alt="" loading="lazy" onError={withFallback(c.fallback)} />
          <div className="collection-box">
            <span>{c.count} dishes</span>
            <h3>{c.label}</h3>
            <button onClick={() => { Setcategory(c.name); goToMenu(); }}>Shop now</button>
          </div>
        </Reveal>
      ))}
    </section>
  );
};

/* Brand story with scroll-inked text and a spinning stamp */
export const Story = () => {
  const { food_list } = useContext(StoreContext);
  const categories = useCategories();
  const stats = [
    [`${food_list.length || 30}+`, 'Dishes on the menu'],
    [categories.length || 8, 'Categories'],
    ['25–35', 'Minutes to your door'],
  ];
  return (
    <section className="section container story">
      <Reveal className="story-media">
        <img src={heroCoffee} alt="Iced coffee topped with cream" loading="lazy" />
        <SpinBadge text="ARSHA • FOOD & COFFEE • ARSHA • FOOD & COFFEE • " size={136} className="story-badge">
          <Icon name="award" size={36} />
        </SpinBadge>
      </Reveal>
      <div className="story-copy">
        <Reveal><span className="section-tag">From our kitchen to your table</span></Reveal>
        <ScrollText className="story-text" text="We cook every order from scratch, with fresh produce, honest spices and coffee brewed cup by cup. No shortcuts, no reheated trays — just food we are proud to put our name on." />
        <div className="story-stats">
          {stats.map(([v, l], i) => (
            <Reveal key={l} className="story-stat" delay={i * 0.1}>
              <strong>{v}</strong><span>{l}</span>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <button className="btn btn-primary btn-lg" onClick={goToMenu}>Explore the menu <Icon name="arrowRight" size={18} /></button>
        </Reveal>
      </div>
    </section>
  );
};
