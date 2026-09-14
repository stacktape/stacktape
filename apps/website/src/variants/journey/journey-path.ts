/**
 * The route across the table: a path through every station plate, drawn as far as the reader has
 * scrolled, with a marker cube riding its tip. Everything is measured from the DOM, so the path
 * follows whatever the responsive layout did with the plates.
 *
 * Segments are either vertical or isometric diagonals (slope 1/2), so every segment lies on the
 * same 2:1 ground the diagram and the grid use. Taken from the plane study and reduced to what
 * this page needs: one route, six stops, no side spur.
 */
type Point = { x: number; y: number };

// A module, not a global script: keeps `journey` out of the page's global scope.
export {};

const anchorOf = (stop: Element) => stop.querySelector('[data-jn-anchor="station"]') ?? stop;

const route = (points: Point[]) => {
  if (points.length === 0) return '';
  let d = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const diagonal = Math.abs(b.x - a.x) / 2;
    const dy = b.y - a.y;
    if (dy <= diagonal + 1) {
      d += ` L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      const drop = (dy - diagonal) / 2;
      d += ` L${a.x.toFixed(1)} ${(a.y + drop).toFixed(1)}`;
      d += ` L${b.x.toFixed(1)} ${(a.y + drop + diagonal).toFixed(1)}`;
      d += ` L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
};

function start(journey: HTMLElement) {
  const svg = journey.querySelector<SVGSVGElement>('.jn-path');
  const line = journey.querySelector<SVGPathElement>('.jn-path__line');
  const road = journey.querySelector<SVGPathElement>('.jn-path__road');
  const plan = journey.querySelector<SVGPathElement>('.jn-path__plan');
  const marker = journey.querySelector<SVGGElement>('.jn-marker');
  if (!svg || !line || !road || !plan || !marker) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stops = [...journey.querySelectorAll<HTMLElement>('[data-jn-stop], [data-jn-terminus]')];

  let length = 0;
  let samples: Array<{ y: number; len: number }> = [];
  let stopLengths: number[] = [];
  let frame = 0;

  const centerOf = (element: Element): Point => {
    const rect = element.getBoundingClientRect();
    const base = journey.getBoundingClientRect();
    return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 };
  };

  // The path only ever moves down the page, so a y position maps to one length along it.
  const lengthAtY = (y: number) => {
    if (samples.length === 0) return 0;
    let low = 0;
    let high = samples.length - 1;
    if (y <= samples[0]!.y) return 0;
    if (y >= samples[high]!.y) return length;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (samples[mid]!.y <= y) low = mid;
      else high = mid;
    }
    const a = samples[low]!;
    const b = samples[high]!;
    const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
    return a.len + (b.len - a.len) * t;
  };

  const layout = () => {
    const width = journey.offsetWidth;
    const height = journey.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const anchors = [...journey.querySelectorAll<HTMLElement>('[data-jn-anchor="station"]')];
    const d = route(anchors.map(centerOf));
    line.setAttribute('d', d);
    road.setAttribute('d', d);
    plan.setAttribute('d', d);
    length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;

    samples = [];
    const count = Math.max(60, Math.round(length / 10));
    for (let i = 0; i <= count; i += 1) {
      const len = (length * i) / count;
      const point = line.getPointAtLength(len);
      samples.push({ y: point.y, len });
    }
    stopLengths = stops.map((stop) => lengthAtY(centerOf(anchorOf(stop)).y));

    update();
  };

  const update = () => {
    frame = 0;
    if (length === 0) return;
    const top = journey.getBoundingClientRect().top;
    const focusY = window.innerHeight * 0.6 - top;
    const drawn = reduceMotion.matches ? length : Math.min(length, Math.max(0, lengthAtY(focusY)));

    line.style.strokeDashoffset = `${length - drawn}`;
    const tip = line.getPointAtLength(drawn);
    marker.setAttribute('transform', `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)})`);

    stops.forEach((stop, index) => {
      const reached = drawn >= (stopLengths[index] ?? Number.POSITIVE_INFINITY) - 2;
      stop.classList.toggle('jn-reached', reached);
    });
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', layout);
  reduceMotion.addEventListener('change', layout);
  if (typeof ResizeObserver !== 'undefined') {
    let pending = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(pending);
      pending = window.requestAnimationFrame(layout);
    });
    observer.observe(journey);
  }
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  layout();

  // Billboards rise from the table as they enter. Without motion (or without the observer) they
  // are simply visible: the `jn-js` class that hides them is only set when motion is allowed.
  const risers = [...journey.querySelectorAll<HTMLElement>('[data-jn-rise]')];
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    risers.forEach((riser) => riser.classList.add('jn-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('jn-in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
  );
  risers.forEach((riser) => io.observe(riser));

  // A restored scroll position or an anchor jump must never leave a billboard invisible.
  const sweep = () => {
    const limit = window.innerHeight * 0.96;
    risers.forEach((riser) => {
      if (riser.getBoundingClientRect().top < limit) riser.classList.add('jn-in');
    });
  };
  window.addEventListener('load', sweep);
  sweep();
}

const journeyElement = document.querySelector<HTMLElement>('[data-jn-journey]');
if (journeyElement) start(journeyElement);
