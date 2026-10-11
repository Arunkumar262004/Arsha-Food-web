// "Add to cart" feedback: a round copy of the dish photo flies in an arc to the cart icon in the header,
// then the icon bounces. The cart icon is marked with data-cart-target (see Navbar).
const CARDS = '.fc, .sp-row, .sp-feature, .hero-card, .hero-dish, .cart-line, .co-item, .pv';

export const bumpCart = () => window.dispatchEvent(new Event('cart:bump'));

/** `from` is the clicked button (its card's photo is used) or an <img> element. */
export const flyToCart = (from) => {
  const target = document.querySelector('[data-cart-target]');
  const img = from?.tagName === 'IMG' ? from : from?.closest?.(CARDS)?.querySelector('img');
  if (!target || !img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { bumpCart(); return; }

  const s = img.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (!s.width) { bumpCart(); return; }
  const size = Math.min(110, s.width, s.height);
  const x0 = s.left + s.width / 2 - size / 2;
  const y0 = s.top + s.height / 2 - size / 2;
  const dx = t.left + t.width / 2 - (x0 + size / 2);
  const dy = t.top + t.height / 2 - (y0 + size / 2);

  const ghost = document.createElement('img');
  ghost.src = img.currentSrc || img.src;
  ghost.alt = '';
  Object.assign(ghost.style, {
    position: 'fixed', left: `${x0}px`, top: `${y0}px`, width: `${size}px`, height: `${size}px`, zIndex: 500,
    objectFit: 'cover', borderRadius: '50%', border: '3px solid #fff', pointerEvents: 'none',
    boxShadow: '0 14px 30px rgba(35, 21, 12, .35)',
  });
  document.body.appendChild(ghost);

  // Rise slightly, then swoop into the cart while shrinking.
  const lift = Math.min(120, Math.abs(dy) * 0.35 + 40);
  const anim = ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - lift}px) scale(.75)`, opacity: 1, offset: 0.4 },
    { transform: `translate(${dx}px, ${dy}px) scale(.16)`, opacity: 0.7 },
  ], { duration: 800, easing: 'cubic-bezier(.45, 0, .2, 1)' });
  anim.onfinish = () => { ghost.remove(); bumpCart(); };
};
