import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreContext } from '../../context/Storecontext';
import { whatsappLink } from '../../config/store';
import { CartControl, VegMark } from '../Fooditem/Fooditem';
import { SplitText, SpinBadge } from '../Motion';
import Icon from '../Icon';
import heroDish from '../../assets/hero_dish.jpg';
import heroCoffee from '../../assets/hero_coffee_cup_big.jpg';
import './Header.css';

const heroBiryani = 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=1600&q=70&auto=format&fit=crop';

const SLIDES = [
  {
    tag: 'Slow-cooked on dum · Since day one',
    lines: [['Royal'], ['dum'], ['biryani,', 'gold'], ['sealed'], ['with'], ['love', 'red']],
    sub: 'Aged basmati, tender meat and whole spices, layered and slow-cooked in a sealed handi — the way it should be.',
    image: heroBiryani, alt: 'Mutton dum biryani served on a platter', fit: 'dish', category: 'Biryani',
  },
  {
    tag: 'Slow-cooked · Served hot',
    lines: [['Fresh', 'gold'], ['food,'], ['cooked'], ['daily'], ['with'], ['care', 'red']],
    sub: 'Hearty curries, crisp dosas, loaded snacks and indulgent desserts — prepared to order and delivered to your door.',
    image: heroDish, alt: 'Steaming bowl of slow-cooked curry with fresh herbs', fit: 'dish', category: 'Meals',
  },
  {
    tag: 'Small batch · Big flavour',
    lines: [['Coffee'], ['brewed'], ['the'], ['slow', 'gold'], ['way', 'gold']],
    sub: 'Hand-pulled espresso, iced lattes and thick shakes — crafted cup by cup to pair perfectly with your meal.',
    image: heroCoffee, alt: 'Iced coffee topped with whipped cream and cocoa', fit: 'cup', category: 'Coffee & Tea',
  },
];
const DURATION = 7000;

const Header = () => {
  const { food_list, imageSrc, settings } = useContext(StoreContext);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [index, paused]);

  // The floating order card shows a real bestseller from the slide's category.
  const pick = useMemo(() => {
    const inCat = food_list.filter((f) => f.category === slide.category);
    return inCat.find((f) => f.tag === 'Bestseller') || inCat[0] || food_list.find((f) => f.tag === 'Bestseller') || food_list[0];
  }, [food_list, slide.category]);

  const go = (dir) => setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Featured">
      {SLIDES.map((s, i) => (
        <div key={i} className={`hero-media fit-${s.fit} ${i === index ? 'active' : ''}`} aria-hidden={i !== index}>
          <img src={s.image} alt={i === index ? s.alt : ''} fetchPriority={i === 0 ? 'high' : undefined} />
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-grain" />

      <div className="container hero-inner">
        {/* key forces the text to re-mount so the word reveal replays on each slide */}
        <div className="hero-copy" key={index}>
          <span className="hero-tag"><Icon name="sparkle" size={14} />{slide.tag}</span>
          <h1 className="hero-title">
            {slide.lines.map(([word, tone], i) => (
              <span key={i} className={`split-word ${tone ? `tone-${tone}` : ''}`}>
                <span style={{ '--d': `${0.15 + i * 0.08}s` }}>{word}</span>
              </span>
            )).reduce((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
          </h1>
          <p className="hero-sub"><SplitText text={slide.sub} delay={0.55} step={0.015} /></p>
          <div className="hero-ctas">
            <a href="#menu" className="btn btn-gold btn-lg">Order now <Icon name="arrowRight" size={18} /></a>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn btn-glass btn-lg">
              <Icon name="whatsapp" size={20} />Order on WhatsApp
            </a>
          </div>
          <div className="hero-stats">
            <span><strong>{food_list.length || '70'}+</strong> dishes</span>
            <span className="dot" />
            <span><strong>25–35</strong> min delivery</span>
            <span className="dot" />
            <span><strong>Free</strong> delivery over {settings.currencySymbol}{settings.freeDeliveryThreshold}</span>
          </div>
        </div>

        {pick && (
          <div className="hero-card" key={`card-${index}`}>
            <Link to={`/viewproduct/${pick._id}`} className="hero-card-img"><img src={imageSrc(pick.image, 220)} alt="" /></Link>
            <div className="hero-card-body">
              <span className="hero-card-label"><VegMark isVeg={pick.isVeg !== false} size={13} />{pick.tag || 'Popular'} today</span>
              <Link to={`/viewproduct/${pick._id}`} className="hero-card-name">{pick.name}</Link>
              <div className="hero-card-foot">
                <strong>{settings.currencySymbol}{pick.price}</strong>
                <CartControl id={pick._id} name={pick.name} />
              </div>
            </div>
          </div>
        )}

        <ul className="hero-trust">
          <li><Icon name="shield" size={20} />Hygienic kitchen</li>
          <li><Icon name="flame" size={20} />Cooked fresh daily</li>
          <li><Icon name="truck" size={20} />Fast delivery</li>
        </ul>

        <SpinBadge text="FRESH • HOT • HANDMADE • FRESH • HOT • HANDMADE • " size={128} className="hero-badge">
          <Icon name="cup" size={34} />
        </SpinBadge>

        <div className="hero-controls">
          <span className="hero-count"><strong>{String(index + 1).padStart(2, '0')}</strong> / {String(SLIDES.length).padStart(2, '0')}</span>
          <button onClick={() => go(-1)} aria-label="Previous slide"><Icon name="arrowLeft" size={18} /></button>
          <div className="hero-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`}>
                {i === index && <span style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
              </button>
            ))}
          </div>
          <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
            <Icon name={paused ? 'play' : 'pause'} size={16} />
          </button>
          <button onClick={() => go(1)} aria-label="Next slide"><Icon name="arrowRight" size={18} /></button>
        </div>
      </div>
    </section>
  );
};

export default Header;
