/**
 * The route across the table: a path through every station plate, drawn as far as the reader has
 * scrolled, with a marker cube riding its tip. Everything is measured from the DOM, so the path
 * follows whatever the responsive layout did with the plates.
 *
 * Segments are either vertical or isometric diagonals (slope 1/2), so every segment lies on the
 * same 2:1 ground the diagram and the grid use.
 */
type Point = { x: number; y: number };
/** A route point; `diagonalFirst` puts the turn right after this point instead of halfway to the next one. */
type RoutePoint = Point & { diagonalFirst?: boolean };

// A module, not a global script: keeps `journey` out of the page's global scope.
export {};

const anchorOf = (stop: Element) => stop.querySelector('[data-pl-anchor="station"]') ?? stop;

const route = (points: RoutePoint[]) => {
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
      const drop = a.diagonalFirst ? 0 : (dy - diagonal) / 2;
      d += ` L${a.x.toFixed(1)} ${(a.y + drop).toFixed(1)}`;
      d += ` L${b.x.toFixed(1)} ${(a.y + drop + diagonal).toFixed(1)}`;
      d += ` L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
};

function start(journey: HTMLElement) {
  const svg = journey.querySelector<SVGSVGElement>('.pl-path');
  const line = journey.querySelector<SVGPathElement>('.pl-path__line');
  const road = journey.querySelector<SVGPathElement>('.pl-path__road');
  const plan = journey.querySelector<SVGPathElement>('.pl-path__plan');
  const spur = journey.querySelector<SVGPathElement>('.pl-path__spur');
  const marker = journey.querySelector<SVGGElement>('.pl-marker');
  if (!svg || !line || !road || !plan || !spur || !marker) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stops = [...journey.querySelectorAll<HTMLElement>('[data-pl-station], [data-pl-terminus]')];
  const incident = journey.querySelector<HTMLElement>('.pl-station--incident');

  let length = 0;
  let samples: Array<{ y: number; len: number }> = [];
  let stopLengths: number[] = [];
  let spurLength = 0;
  let spurShown = false;
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

    // Station plates plus any exit waypoints (a station that is taller than its plate, like the incident
    // spur, declares one so the route leaves it at the bottom instead of cutting across it).
    const waypoints = [...journey.querySelectorAll<HTMLElement>('[data-pl-anchor="station"], [data-pl-anchor="exit"]')];
    const d = route(
      waypoints.map((anchor) => Object.assign(centerOf(anchor), { diagonalFirst: anchor.dataset.plAnchor === 'exit' }))
    );
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

    if (incident) {
      const beats = [...incident.querySelectorAll('[data-pl-anchor="beat"], [data-pl-anchor="optin"]')].map(centerOf);
      const from = centerOf(anchorOf(incident));
      spur.setAttribute('d', route([from, ...beats]));
      spurLength = spur.getTotalLength();
      spur.style.strokeDasharray = `${spurLength}`;
      spur.style.strokeDashoffset = spurShown || reduceMotion.matches ? '0' : `${spurLength}`;
    }

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
      stop.classList.toggle('pl-reached', reached);
      if (reached && stop === incident && !spurShown) {
        spurShown = true;
        spur.style.strokeDashoffset = '0';
      }
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

  // Billboards rise from the table as they enter; each preview's own sequence starts from the same class.
  const risers = [...journey.querySelectorAll<HTMLElement>('[data-pl-rise]')];
  if (!('IntersectionObserver' in window)) {
    risers.forEach((riser) => riser.classList.add('pl-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('pl-in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );
  risers.forEach((riser) => io.observe(riser));
}

const journeyElement = document.querySelector<HTMLElement>('[data-pl-journey]');
if (journeyElement) start(journeyElement);
