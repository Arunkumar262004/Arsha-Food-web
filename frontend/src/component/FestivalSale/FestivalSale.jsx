import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../context/Storecontext';
import Fooditem, { VegMark } from '../Fooditem/Fooditem';
import { catLabel } from '../Explorermenu/categories';
import { Reveal } from '../Motion';
import Icon from '../Icon';
import './FestivalSale.css';

const useCountdown = (target, onDone) => {
  const calc = () => Math.max(0, new Date(target) - Date.now());
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => {
      const left = calc();
      setMs(left);
      if (left === 0) { clearInterval(id); onDone?.(); }
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
};

const Countdown = ({ to, label, onDone }) => {
  const [d, h, m, s] = useCountdown(to, onDone);
  const cells = [[d, 'Days'], [h, 'Hrs'], [m, 'Min'], [s, 'Sec']].filter(([v], i) => i > 0 || v > 0);
  return (
    <div className="fs-count" role="timer" aria-label={`${label} ${d} days ${h} hours ${m} minutes`}>
      <span className="fs-count-label">{label}</span>
      <div>
        {cells.map(([v, l]) => <span key={l} className="fs-cell"><strong>{String(v).padStart(2, '0')}</strong><small>{l}</small></span>)}
      </div>
    </div>
  );
};

const when = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// "Notify me" form: name, mobile, email. Remembers the sign-up in this browser.
const NotifyForm = ({ sale }) => {
  const { url, user } = useContext(StoreContext);
  const key = `sale-signup-${sale._id}`;
  const [done, setDone] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (user) setF((p) => ({ name: p.name || user.name || '', phone: p.phone || user.phone || '', email: p.email || user.email || '' })); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await axios.post(`${url}/api/sales/${sale._id}/notify`, f);
      setDone(true);
      try { localStorage.setItem(key, '1'); } catch { /* private mode */ }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your details. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="fs-done" role="status">
        <span><Icon name="check" size={22} /></span>
        <div><strong>You're on the list!</strong><p>We'll email you the moment {sale.name} starts on {when(sale.startsAt)}.</p></div>
      </div>
    );
  }
  return (
    <form className="fs-form" onSubmit={submit}>
      <strong className="fs-form-title"><Icon name="mail" size={18} />Get notified when it unlocks</strong>
      <div className="fs-fields">
        <input aria-label="Your name" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} />
        <div className="fs-phone"><span>+91</span><input aria-label="Mobile number" placeholder="Mobile number" inputMode="numeric" maxLength={10} required
          value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></div>
        <input aria-label="Email address" type="email" placeholder="Email address" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <button type="submit" className="fs-btn" disabled={busy}>{busy ? 'Saving…' : 'Notify me'}</button>
      </div>
      {error ? <span className="fs-error" role="alert">{error}</span> : <small>We'll only use these to tell you about this sale.</small>}
    </form>
  );
};

const FestivalSale = () => {
  const { sales, food_list, refreshPricing, imageSrc, settings } = useContext(StoreContext);
  const sale = sales[0];
  // Live sale: the menu already carries sale prices, so reuse the normal product cards.
  const liveItems = useMemo(() => {
    if (!sale || sale.status !== 'live') return [];
    const ids = new Set(sale.items.map((i) => String(i.food._id)));
    return food_list.filter((f) => ids.has(String(f._id)));
  }, [sale, food_list]);

  if (!sale || !sale.items.length) return null;
  const live = sale.status === 'live';
  const cur = settings.currencySymbol;

  return (
    <section className={`fs ${live ? 'is-live' : 'is-upcoming'}`} id="sale" style={{ '--fs': sale.themeColor }}>
      <div className="fs-bg" aria-hidden="true"><span /><span /><span /></div>
      <div className="container">
        <Reveal className="fs-head">
          <div>
            <span className="fs-kicker">{live ? <><span className="fs-live-dot" />Live now</> : <><Icon name="lock" size={14} />Unlocks {when(sale.startsAt)}</>}</span>
            <h2>{sale.name}</h2>
            {sale.tagline && <p>{sale.tagline}</p>}
            {sale.maxOff > 0 && <span className="fs-off">Up to <strong>{sale.maxOff}% off</strong> on {sale.items.length} dish{sale.items.length === 1 ? '' : 'es'}</span>}
          </div>
          <Countdown to={live ? sale.endsAt : sale.startsAt} label={live ? 'Ends in' : 'Starts in'} onDone={refreshPricing} />
        </Reveal>

        {live ? (
          <div className="fs-grid">
            {liveItems.map((item, i) => <Fooditem key={item._id} item={item} index={i} />)}
          </div>
        ) : (
          <>
            <div className="fs-grid">
              {sale.items.map(({ food }, i) => (
                <Reveal key={food._id} className="fs-locked" delay={Math.min(i, 3) * 0.07}>
                  <div className="fs-locked-media">
                    <img src={imageSrc(food.image, 480)} alt="" loading="lazy" />
                    <span className="fs-lock"><Icon name="lock" size={22} /></span>
                  </div>
                  <div className="fs-locked-body">
                    <span className="fs-locked-meta"><VegMark isVeg={food.isVeg !== false} size={13} />{catLabel(food.category)}</span>
                    <strong>{food.name}</strong>
                    <div className="fs-locked-price">
                      <span className="fs-blur" aria-hidden="true">{cur}•••</span>
                      <span className="sr-only">Sale price revealed when the sale starts</span>
                      <s>{cur}{food.price}</s>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <NotifyForm sale={sale} />
          </>
        )}
      </div>
    </section>
  );
};

export default FestivalSale;
