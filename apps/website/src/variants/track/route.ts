/**
 * The route line.
 *
 * One polyline from the gold repository node under the command box to the arrival plate under the
 * last surface: a 2:1 isometric diagonal into the left track, straight down the track through the
 * six plates and the four visitor nodes, and a 2:1 diagonal out to the arrival plate. Every vertex
 * is measured from the DOM, so the line lands exactly on the plates whatever the surface heights.
 *
 * Two things are laid out here rather than in CSS because they depend on measured geometry: the
 * lead row's top padding (so the first diagonal is exactly 2:1) and the incident node's vertical
 * position (it aligns to the 14:08 row of the incident timeline inside the fifth screen).
 *
 * The line reveals itself with scroll: the drawn tip sits a little below the middle of the
 * viewport, so a plate is reached as its surface comes into view. Under reduced motion the whole
 * route is drawn from the start. Nothing rides the line. Below 960px the track is hidden and
 * nothing here runs.
 */
type Pt = { x: number; y: number };

// A module, not a global script: keeps these names out of the page's global scope.
export {};

/** Layout position of `element` inside `root`, from offsets: transforms do not affect it. */
const offsetWithin = (element: HTMLElement, root: HTMLElement): Pt => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
};

const centreOf = (element: HTMLElement, root: HTMLElement): Pt => {
  const at = offsetWithin(element, root);
  return { x: at.x + element.offsetWidth / 2, y: at.y + element.offsetHeight / 2 };
};

function start(board: HTMLElement) {
  const svg = board.querySelector<SVGSVGElement>('.tk-route');
  const line = board.querySelector<SVGPathElement>('.tk-route__line');
  const glow = board.querySelector<SVGPathElement>('.tk-route__glow');
  const plan = board.querySelector<SVGPathElement>('.tk-route__plan');
  const startDot = board.querySelector<HTMLElement>('[data-tk-start]');
  const leadRow = board.querySelector<HTMLElement>('[data-tk-lead]');
  const leadDot = board.querySelector<HTMLElement>('[data-tk-node="init"] [data-tk-dot]');
  const endTile = board.querySelector<HTMLElement>('[data-tk-end-tile]');
  const plates = [...board.querySelectorAll<HTMLElement>('[data-tk-plate]')];
  const alignedNode = board.querySelector<HTMLElement>('[data-tk-align-to]');
  const surfaces = [...board.querySelectorAll<HTMLElement>('[data-tk-surface]')];
  if (!svg || !line || !glow || !plan || !startDot || !leadRow || !leadDot || !endTile || plates.length === 0) return;

  const wide = window.matchMedia('(min-width: 960px)');
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

  /** Moves the incident node so its dot sits on the timeline row the visitor acts in. */
  const alignNode = () => {
    if (!alignedNode) return;
    const cell = alignedNode.parentElement;
    const targetId = alignedNode.dataset.tkAlignTo;
    const target = targetId ? board.querySelector<HTMLElement>(`[data-tk-align="${targetId}"]`) : null;
    if (!cell || !target) return;
    const dot = alignedNode.querySelector<HTMLElement>('[data-tk-dot]');
    const dotHalf = dot ? dot.offsetHeight / 2 : 6;
    const targetY = centreOf(target, board).y;
    const cellY = offsetWithin(cell, board).y;
    alignedNode.style.top = `${Math.max(0, targetY - cellY - dotHalf).toFixed(1)}px`;
  };

  /** Pads the lead row so the diagonal from the repository node into the track is exactly 2:1. */
  const alignLead = () => {
    leadRow.style.paddingTop = '';
    const from = centreOf(startDot, board);
    const to = centreOf(leadDot, board);
    const wanted = from.y + Math.abs(from.x - to.x) / 2;
    const base = parseFloat(getComputedStyle(leadRow).paddingTop) || 0;
    leadRow.style.paddingTop = `${Math.max(0, base + wanted - to.y).toFixed(1)}px`;
  };

  const layout = () => {
    if (!wide.matches) {
      svg.classList.remove('is-ready');
      leadRow.style.paddingTop = '';
      if (alignedNode) alignedNode.style.top = '';
      plates.forEach((plate) => plate.classList.remove('is-reached'));
      total = 0;
      return;
    }

    alignLead();
    alignNode();

    boardTop = board.getBoundingClientRect().top + window.scrollY;
    const width = board.offsetWidth;
    const height = board.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const from = centreOf(startDot, board);
    const plateCentres = plates.map((plate) => centreOf(plate, board));
    const trackX = plateCentres[0]!.x;
    const end = centreOf(endTile, board);
    const lastPlate = plateCentres[plateCentres.length - 1]!;

    // Down the diagonal into the track, straight down past the last plate, then out at 2:1 to the
    // arrival tile. The exit height follows from the tile's position so the slope stays exact.
    const elbow: Pt = { x: trackX, y: from.y + Math.abs(from.x - trackX) / 2 };
    const exitY = Math.max(lastPlate.y + 40, end.y - Math.abs(end.x - trackX) / 2);
    points = [from, elbow, { x: trackX, y: exitY }, end];

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
    plateLen = plateCentres.map((centre) => lengthAtY(centre.y));

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
    // The tip runs ahead of the reading position: a plate lights up as its surface enters the
    // lower part of the viewport, and on load the line already reaches the first plate.
    const tipY = window.scrollY + window.innerHeight * 0.78 - boardTop;
    const len = reduceMotion.matches ? total : Math.min(total, lengthAtY(tipY));
    line.style.strokeDashoffset = `${total - len}`;
    glow.style.strokeDashoffset = `${total - len}`;
    plates.forEach((plate, k) => plate.classList.toggle('is-reached', len >= (plateLen[k] ?? Infinity) - 0.5));
    endTile.classList.toggle('is-reached', len >= total - 0.5);
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
  wide.addEventListener('change', scheduleLayout);
  reduceMotion.addEventListener('change', scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(board);
    surfaces.forEach((surface) => observer.observe(surface));
  }
  if (document.fonts?.ready) document.fonts.ready.then(scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  layout();
}

const board = document.querySelector<HTMLElement>('[data-tk-board]');
if (board) start(board);
