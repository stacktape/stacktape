/**
 * The route: one polyline from the start interchange under the hero to the final plate after 06.
 *
 * It descends through every surface at the centre (that part is hidden: the surfaces are opaque
 * and sit above the SVG) and bends out at 45° to each gold interchange. An interchange lives in a
 * row exactly twice as tall as its horizontal offset (`--zz-offset` in the stylesheet), so both
 * legs are 45° by construction. Nothing is assumed: every vertex is measured from the DOM with
 * layout offsets, which ignore the entry transforms the surfaces animate with, and a warning is
 * logged if a leg drifts off 45°.
 *
 * The line draws with scroll: the drawn tip sits at 58% of the viewport height, and what has been
 * drawn stays drawn. Reduced motion draws it all at once. Below 900px nothing is drawn and the
 * interchanges are rows in the flow.
 *
 * The same module reveals the surfaces: each `[data-zz-rise]` element fades and rises 12px the
 * first time it enters the viewport, and stays. Without JavaScript nothing is hidden.
 */
type Pt = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
type Mark = { element: HTMLElement; length: number };

// A module, not a global script: keeps these names out of the page's global scope.
export {};

/** Layout box of `element` relative to `root`, ignoring transforms. `root` must be positioned. */
const boxWithin = (element: HTMLElement, root: HTMLElement): Box => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: element.offsetWidth, h: element.offsetHeight };
};

function start(board: HTMLElement) {
  const svg = board.querySelector<SVGSVGElement>('[data-zz-route]');
  const line = svg?.querySelector<SVGPathElement>('.zz-route__line');
  const glow = svg?.querySelector<SVGPathElement>('.zz-route__glow');
  const plan = svg?.querySelector<SVGPathElement>('.zz-route__plan');
  const nodes = [...board.querySelectorAll<HTMLElement>('[data-zz-node]')];
  if (!svg || !line || !glow || !plan || nodes.length === 0) return;

  const desktop = window.matchMedia('(min-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let points: Pt[] = [];
  let lengths: number[] = [];
  let marks: Mark[] = [];
  let total = 0;
  let drawn = 0;
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

  const clear = () => {
    total = 0;
    drawn = 0;
    svg.classList.remove('is-ready');
    for (const node of nodes) node.classList.remove('is-reached');
  };

  const layout = () => {
    if (!desktop.matches) {
      clear();
      return;
    }
    boardTop = board.getBoundingClientRect().top + window.scrollY;
    svg.setAttribute('viewBox', `0 0 ${board.offsetWidth} ${board.offsetHeight}`);

    // Start dot → for each surface its top-centre and bottom-centre → each interchange dot →
    // the final plate's centre. Document order is route order.
    points = [];
    const markIndex: Array<{ element: HTMLElement; index: number }> = [];
    for (const node of nodes) {
      if (node.dataset.zzNode === 'surface') {
        const box = boxWithin(node, board);
        const cx = box.x + box.w / 2;
        points.push({ x: cx, y: box.y }, { x: cx, y: box.y + box.h });
      } else {
        const dot = node.querySelector<HTMLElement>('[data-zz-dot]') ?? node;
        const box = boxWithin(dot, board);
        points.push({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
        markIndex.push({ element: node, index: points.length - 1 });
      }
    }

    // A route that only ever descends keeps the scroll mapping monotonic.
    for (let i = 1; i < points.length; i += 1) {
      if (points[i]!.y < points[i - 1]!.y) points[i]!.y = points[i - 1]!.y;
    }

    // Both legs of a detour must be 45° in screen space. The stylesheet guarantees it; say so if not.
    for (const mark of markIndex) {
      if (mark.element.dataset.zzNode !== 'ic') continue;
      const before = points[mark.index - 1];
      const here = points[mark.index]!;
      const after = points[mark.index + 1];
      for (const other of [before, after]) {
        if (!other) continue;
        const dx = Math.abs(other.x - here.x);
        const dy = Math.abs(other.y - here.y);
        if (Math.abs(dx - dy) > 1.5)
          console.warn(`zigzag: interchange leg is not 45° (dx ${dx.toFixed(1)}, dy ${dy.toFixed(1)})`);
      }
    }

    lengths = [0];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      lengths.push(lengths[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
    }
    total = lengths[lengths.length - 1]!;
    marks = markIndex.map(({ element, index }) => ({ element, length: lengths[index]! }));

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
    drawn = Math.min(total, Math.max(drawn, len));
    line.style.strokeDashoffset = `${total - drawn}`;
    glow.style.strokeDashoffset = `${total - drawn}`;
    for (const mark of marks) {
      if (drawn >= mark.length - 0.5) mark.element.classList.add('is-reached');
    }
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
  desktop.addEventListener('change', scheduleLayout);
  reduceMotion.addEventListener('change', scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(board);
    for (const node of nodes) observer.observe(node);
  }
  if (document.fonts?.ready) document.fonts.ready.then(scheduleLayout);
  window.addEventListener('load', scheduleLayout);
  layout();
}

/** Surfaces and labels rise into place the first time they enter the viewport, then stay. */
function reveal(root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-zz-rise]')];
  if (items.length === 0) return;
  if (typeof IntersectionObserver === 'undefined') {
    for (const item of items) item.classList.add('is-in');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.01 }
  );
  for (const item of items) observer.observe(item);
  // Printing has no scroll: show everything.
  window.addEventListener('beforeprint', () => {
    for (const item of items) item.classList.add('is-in');
  });
}

const board = document.querySelector<HTMLElement>('[data-zz-board]');
if (board) {
  reveal(board);
  start(board);
}
