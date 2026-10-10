import { useContext, useMemo } from 'react';
import { StoreContext } from '../../context/Storecontext';

const u = (id) => `https://images.unsplash.com/photo-${id}?w=700&q=70&auto=format&fit=crop`;

// Curated order and cover photo per category. Categories the admin adds later still appear (after these),
// using their first dish's photo as the cover.
const CATALOG = [
  ['Biryani', u('1633945274405-b6c8069047b0')],
  ['Meals', u('1625398407796-82650a8c135f')],
  ['South Indian', u('1668236543090-82eba5ee5976')],
  ['Starters', u('1610057099443-fde8c4d50f91')],
  ['Snacks', u('1601050690597-df0568f70950')],
  ['Burgers & Pizza', u('1568901346375-23c9450c58cd')],
  ['Rolls', u('1626777552726-4a6b54c97e46')],
  ['Sandwich', u('1528735602780-2552fd46c7af')],
  ['Noodles', u('1569718212165-3a8278d5f624')],
  ['Pasta', u('1608897013039-887f21d8c804')],
  ['Pure Veg', u('1631452180519-c014fe946bc7')],
  ['Salad', u('1540420773420-3366772f4999')],
  ['Cool Drinks', u('1551538827-9c037cb4f32a')],
  ['Juices & Shakes', u('1572490122747-3968b75cc699')],
  ['Coffee & Tea', u('1509042239860-f550ce710b93')],
  ['Cake', u('1578985545062-69928b1d9587')],
  ['Deserts', u('1563805042-7684c019e1cb')],
];

const LABELS = { Deserts: 'Desserts' };
// Display name for a stored category (fixes legacy spellings without touching the data).
export const catLabel = (name) => LABELS[name] || name;

// Categories that currently have dishes, in curated order, with item counts and cover photos.
export const useCategories = () => {
  const { food_list, imageSrc } = useContext(StoreContext);
  return useMemo(() => {
    const counts = {};
    const firstImage = {};
    for (const f of food_list) {
      counts[f.category] = (counts[f.category] || 0) + 1;
      if (!firstImage[f.category]) firstImage[f.category] = imageSrc(f.image);
    }
    const known = CATALOG.map(([name, photo]) => ({ name, photo }));
    const extra = Object.keys(counts).filter((c) => !known.some((k) => k.name === c)).map((name) => ({ name, photo: firstImage[name] }));
    return [...known, ...extra]
      .map((c) => ({ ...c, label: catLabel(c.name), count: counts[c.name] || 0, fallback: firstImage[c.name] }))
      .filter((c) => c.count > 0);
  // imageSrc is a stable formatter; recomputing only when the menu changes is enough.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food_list]);
};

// <img onError> helper: swap to a fallback image once.
export const withFallback = (fallback) => (e) => {
  if (fallback && !e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = '1'; e.currentTarget.src = fallback; }
};

// "Recommended" order: curated category order, bestsellers first within each category.
const ORDER = Object.fromEntries(CATALOG.map(([name], i) => [name, i]));
export const recommended = (list, bestsellersFirst = false) => [...list].sort((a, b) => {
  const best = (b.tag === 'Bestseller') - (a.tag === 'Bestseller');
  if (bestsellersFirst && best) return best;
  const cat = (ORDER[a.category] ?? 99) - (ORDER[b.category] ?? 99);
  return cat || best;
});
