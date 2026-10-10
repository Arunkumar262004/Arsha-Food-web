import React, { useEffect, useRef, useState } from "react";

// Adds `.is-in` once the element scrolls into view (pairs with `.reveal` in index.css).
export const Reveal = ({ as = "div", delay = 0, className = "", style, children, ...rest }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${inView ? "is-in" : ""} ${className}`} style={{ ...style, "--d": `${delay}s` }} {...rest}>
      {children}
    </Tag>
  );
};

// Splits text into words that slide up one after another. `key` it to replay.
export const SplitText = ({ text, delay = 0, step = 0.07, className }) => (
  <span className={className} aria-label={text}>
    {text.split(" ").map((w, i) => (
      <React.Fragment key={i}>
        <span className="split-word" aria-hidden="true">
          <span style={{ "--d": `${delay + i * step}s` }}>{w}</span>
        </span>{" "}
      </React.Fragment>
    ))}
  </span>
);

// Endless horizontal ticker; children are rendered twice so the loop is seamless.
export const Marquee = ({ children, speed = 32, reverse = false, className = "" }) => (
  <div className={`marquee ${reverse ? "reverse" : ""} ${className}`} style={{ "--speed": `${speed}s` }}>
    <div className="marquee-track">{children}</div>
    <div className="marquee-track" aria-hidden="true">{children}</div>
  </div>
);

// Text set on a circle that slowly rotates — the "stamp" badge seen on craft coffee sites.
export const SpinBadge = ({ text, size = 120, children, className = "" }) => {
  const id = useRef(`c${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className={`spin-wrap ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="spin-badge" width={size} height={size} aria-hidden="true">
        <defs><path id={id} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
        <text fontSize="9.2" fontWeight="600" letterSpacing="2.6" fill="currentColor">
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
};

// Paragraph whose words "ink in" one by one as it scrolls through the viewport.
export const ScrollText = ({ text, className = "" }) => {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(" ");

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 when the top enters at 85% of the viewport, 1 when the bottom reaches 45%.
        const p = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
        setProgress(Math.max(0, Math.min(1, p)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const lit = Math.round(progress * words.length);
  return (
    <p ref={ref} className={`scroll-text ${className}`}>
      {words.map((w, i) => <span key={i} className={i < lit ? "lit" : ""}>{w} </span>)}
    </p>
  );
};
