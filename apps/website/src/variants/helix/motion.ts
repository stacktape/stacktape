/**
 * Motion for the helix study. The server renders the final state of everything; this file only
 * runs the way there, and only when the visitor has not asked for reduced motion.
 */
const root = document.querySelector<HTMLElement>('.hx-root');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

if (root && !reduce.matches) {
  root.classList.add('hx-motion');

  // Deploy counter: shown finished by the server, wound back to 30/33 now, counted up on enter.
  const counter = document.querySelector<HTMLElement>('[data-hx-count]');
  const [from, to] = (counter?.dataset.hxCount ?? '0,0').split(',').map(Number) as [number, number];
  if (counter) counter.textContent = String(from);

  const runDeploy = (station: Element) => {
    if (!counter) return;
    let value = from;
    const tick = () => {
      value += 1;
      counter.textContent = String(value);
      if (value < to) window.setTimeout(tick, 380);
      else station.classList.add('is-done');
    };
    window.setTimeout(tick, 600);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
        if (entry.target.hasAttribute('data-hx-deploy')) runDeploy(entry.target);
      }
    },
    { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
  );
  document.querySelectorAll('[data-hx-reveal]').forEach((element) => observer.observe(element));

  // The spine draws as the visitor scrolls: progress is where the viewport's lower third sits
  // within the journey. It is set on the journey element, which every spine rule reads.
  const journey = document.querySelector<HTMLElement>('.hx-journey');
  if (journey) {
    let scheduled = false;
    const draw = () => {
      scheduled = false;
      const rect = journey.getBoundingClientRect();
      const anchor = window.innerHeight * 0.66;
      const progress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
      journey.style.setProperty('--hx-spine', progress.toFixed(4));
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(draw);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    draw();
  }
}
