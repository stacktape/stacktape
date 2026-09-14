/**
 * The board's route.
 *
 * One polyline from the start plate under the command box to the arrival plate after the last
 * card. Each step's plate sits in the free strip beside its card; the route arrives at the plate
 * diagonally from wherever it was, runs straight down the strip past the card, and leaves
 * diagonally for the next plate on the other side. The geometry is free (any angle), measured
 * from the DOM, so the line always lands exactly on the plates whatever the card heights are.
 *
 * The line reveals itself with scroll: the drawn tip sits a little below the middle of the
 * viewport, so a plate is reached as its card comes into view. Under reduced motion the whole
 * route is drawn from the start. Nothing rides the line.
 */
type Pt = { x: number; y: number };

// A module, not a global script: keeps these names out of the page's global scope.
export {};

const centreOf = (element: Element, base: DOMRect): Pt => {
  const tile = element.querySelector('[data-hm-tile]') ?? element;
  const rect = tile.getBoundingClientRect();
  return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 };
};

function start(board: HTMLElement) {
  const svg = board.querySelector<SVGSVGElement>('.hm-path');
  const line = board.querySelector<SVGPathElement>('.hm-path__line');
  const glow = board.querySelector<SVGPathElement>('.hm-path__glow');
  const plan = board.querySelector<SVGPathElement>('.hm-path__plan');
  const startPlate = board.querySelector<HTMLElement>('[data-hm-plate="start"]');
  const endPlate = board.querySelector<HTMLElement>('[data-hm-plate="end"]');
  const steps = [...board.querySelectorAll<HTMLElement>('[data-hm-moment]')];
  if (!svg || !line || !glow || !plan || !startPlate || !endPlate) return;

  const stepPlates: HTMLElement[] = [];
  const cards: HTMLElement[] = [];
  for (const step of steps) {
    const plate = step.querySelector<HTMLElement>('[data-hm-plate="moment"]');
    const card = step.querySelector<HTMLElement>('[data-hm-card]');
    if (!plate || !card) return;
    stepPlates.push(plate);
    cards.push(card);
  }
  const plates = [startPlate, ...stepPlates, endPlate];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let points: Pt[] = [];
  let lengths: number[] = [];
  let plateLen: number[] = [];
  let total = 0;
  let boardTop = 0;
  let frame = 0;

  /** The route length at which its vertical position first reaches `y`; the route only descends. */
  const lengthAtY = (y: number): number => {
    if (points.length === 0) return 0;
    if (y <= points[0]!.y) return 0;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      if (y <= b.y) {
        const t = b.y === a.y ? 1 : (y - a.y) / (b.y - a.y);
        return lengths[i - 1]! + (lengths[i]! - lengths[i - 1]!) * t;
      }
    }
    return total;
  };

  const layout = () => {
    const base = board.getBoundingClientRect();
    boardTop = base.top + window.scrollY;
    svg.setAttribute('viewBox', `0 0 ${Math.round(base.width)} ${Math.round(base.height)}`);

    const plateCentres = plates.map((plate) => centreOf(plate, base));
    const gutter = getComputedStyle(board).getPropertyValue('--hm-lane').trim() === 'gutter';

    // Start plate → for each card: its plate, then straight down the strip to just below the
    // card → arrival plate. Every vertex is measured, so the diagonals land exactly on the plates.
    points = [plateCentres[0]!];
    const plateIndex = [0];
    cards.forEach((card, i) => {
      const plate = plateCentres[i + 1]!;
      const rect = card.getBoundingClientRect();
      points.push(plate);
      plateIndex.push(points.length - 1);
      const exitY = rect.bottom - base.top + (gutter ? 8 : 24);
      if (exitY > plate.y + 8) points.push({ x: plate.x, y: exitY });
    });
    points.push(plateCentres[plates.length - 1]!);
    plateIndex.push(points.length - 1);

    // A route that only ever descends keeps the scroll mapping monotonic.
    for (let i = 1; i < points.length; i += 1) {
      if (points[i]!.y < points[i - 1]!.y) points[i]!.y = points[i - 1]!.y;
    }

    lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      lengths.push(lengths[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
    }
    total = lengths[lengths.length - 1]!;
    plateLen = plateIndex.map((index) => lengths[index]!);

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    line.setAttribute('d', d);
    glow.setAttribute('d', d);
    plan.setAttribute('d', d);
    line.style.strokeDasharray = `${total}`;
    glow.style.strokeDasharray = `${total}`;

    svg.classList.add('is-ready');
    update();
  };

  const update = () => {
    frame = 0;
    if (total === 0) return;
    const tipY = window.scrollY + window.innerHeight * 0.58 - boardTop;
    const len = reduceMotion.matches ? total : Math.min(total, lengthAtY(tipY));
    line.style.strokeDashoffset = `${total - len}`;
    glow.style.strokeDashoffset = `${total - len}`;
    plates.forEach((plate, k) => plate.classList.toggle('is-reached', len >= (plateLen[k] ?? Infinity) - 0.5));
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  let relayout = 0;
  const scheduleLayout = () => {
    window.cancelAnimationFrame(relayout);
    relayout = window.requestAnimationFrame(layout);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', scheduleLayout);
  reduceMotion.addEventListener('change', scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(board);
    cards.forEach((card) => observer.observe(card));
  }
  if (document.fonts?.ready) document.fonts.ready.then(scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  layout();
}

const board = document.querySelector<HTMLElement>('[data-hm-board]');
if (board) start(board);
