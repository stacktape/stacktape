import type { StacktapeConfig } from '@stacktape/config';
import { IsometricDiagram } from '@stacktape/ui-react/isometric-diagram';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@stacktape/ui-react/isometric-diagram.css';
import type { StageTag } from './data';
import { ACME_CONFIG, CHAPTERS, sparkline } from './data';

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Box = { x1: number; y1: number; x2: number; y2: number };
/** A node as drawn: the centre of its roof, and its full extent including the name below it. */
type NodeBox = { x: number; top: number; width: number; height: number };
type Model = { nodes: Map<string, NodeBox>; content: Size };
type Camera = { scale: number; tx: number; ty: number };

const DIAGRAM_LABEL =
  'Architecture diagram of acme-project: web and apiService are public behind the firewall; worker, cache and mainDatabase sit inside the private network';

/** The model fills the stage up to this much; a chapter's zoom multiplies it. */
const MAX_FIT = 1.06;
/** How far the camera leans toward the chapter's node, as a fraction of the node's distance from the centre. */
const PULL = 0.4;
/** The gap between a node's roof and the chip above it, and the pitch of stacked chips. */
const LIFT = 8;
const STACK = 26;
/** How close to the stage's edge a chip may sit. */
const EDGE = 10;
const IDENTITY: Camera = { scale: 1, tx: 0, ty: 0 };

/**
 * Where each node's roof sits, as a fraction of the stage's width and height, and how wide and tall
 * it is as a fraction of the width. Measured once in the browser at 1440×900; used only if the
 * rendered SVG cannot be read.
 */
const FALLBACK: Record<string, [number, number, number, number]> = {
  user: [0.114, 0.615, 0.123, 0.074],
  web: [0.199, 0.54, 0.123, 0.067],
  firewall: [0.289, 0.574, 0.123, 0.076],
  'apiService--gw': [0.374, 0.501, 0.123, 0.067],
  apiService: [0.549, 0.455, 0.123, 0.075],
  mainDatabase: [0.62, 0.333, 0.123, 0.08],
  cache: [0.711, 0.376, 0.123, 0.08],
  'web--server': [0.724, 0.536, 0.123, 0.075],
  worker: [0.815, 0.579, 0.123, 0.075],
  'web--assets': [0.886, 0.465, 0.123, 0.071]
};
const FALLBACK_CONTENT: [number, number] = [0.87, 0.399];

const CONFIG = ACME_CONFIG as unknown as StacktapeConfig;

/**
 * Reads where every node is, in the stage's own pixels, straight from the SVG geometry.
 *
 * `getBBox` is in the drawing's user units and ignores CSS transforms, so the answer is the same
 * whichever way the camera is currently leaning. The user-unit to pixel mapping is the one the
 * browser applies for `preserveAspectRatio="xMidYMid meet"`, with the wrapper's layout size as the
 * viewport, which is also unaffected by transforms. The content size is the drawing without the
 * padding the renderer adds around it, so the camera can fit the model to the stage.
 */
const readModel = (host: HTMLElement): Model | null => {
  const svg = host.querySelector<SVGSVGElement>('svg.stp-diagram__canvas');
  const groups = svg ? Array.from(svg.querySelectorAll<SVGGElement>('[data-iso-kind="node"]')) : [];
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!svg || groups.length === 0 || !width || !height) return null;

  const box = svg.viewBox.baseVal;
  if (!box.width || !box.height) return null;
  const scale = Math.min(width / box.width, height / box.height);
  const offsetX = (width - box.width * scale) / 2;
  const offsetY = (height - box.height * scale) / 2;

  const nodes = new Map<string, NodeBox>();
  for (const group of groups) {
    const id = group.dataset.isoId;
    if (!id) continue;
    let bounds: DOMRect;
    try {
      bounds = group.getBBox();
    } catch {
      continue;
    }
    if (!bounds.width) continue;
    nodes.set(id, {
      x: offsetX + (bounds.x + bounds.width / 2 - box.x) * scale,
      top: offsetY + (bounds.y - box.y) * scale,
      width: bounds.width * scale,
      height: bounds.height * scale
    });
  }
  if (nodes.size === 0) return null;
  // The renderer pads the drawing by 80 user units on every side.
  return { nodes, content: { width: (box.width - 160) * scale, height: (box.height - 160) * scale } };
};

const fallbackModel = (size: Size): Model => ({
  nodes: new Map(
    Object.entries(FALLBACK).map(([id, [x, y, w, h]]) => [
      id,
      { x: x * size.width, top: y * size.height, width: w * size.width, height: h * size.width }
    ])
  ),
  content: { width: FALLBACK_CONTENT[0] * size.width, height: FALLBACK_CONTENT[1] * size.width }
});

/**
 * The stage is a picture, not the wizard: nothing in it is focusable, and the nodes appear one after
 * another from the visitor's side of the model (left) to the data on the right.
 */
const prepareDiagram = (host: HTMLElement, model: Model) => {
  const section = host.querySelector<HTMLElement>('.stp-diagram');
  if (section) section.tabIndex = -1;
  const order = Array.from(model.nodes.entries())
    .toSorted((a, b) => a[1].x - b[1].x)
    .map(([id]) => id);
  for (const group of host.querySelectorAll<SVGGElement>('[data-iso-kind="node"]')) {
    const index = order.indexOf(group.dataset.isoId ?? '');
    group.style.setProperty('--sg-i', String(Math.max(0, index)));
  }
};

/** The scale at which the model fills the stage, leaving a small margin, capped so it never looms. */
const fitScale = (model: Model, size: Size) =>
  Math.max(
    1,
    Math.min(
      MAX_FIT,
      (size.width - 24) / Math.max(1, model.content.width),
      (size.height - 24) / Math.max(1, model.content.height)
    )
  );

const cameraFor = (chapter: number, model: Model, size: Size, still: boolean): Camera => {
  const spec = CHAPTERS[chapter]?.camera ?? { scale: 1 };
  const base = fitScale(model, size);
  if (still || spec.scale === 1) return { scale: base, tx: 0, ty: 0 };
  const scale = base * spec.scale;
  const nodes = (spec.focus ?? []).map((id) => model.nodes.get(id)).filter((node): node is NodeBox => Boolean(node));
  if (nodes.length === 0) return { scale, tx: 0, ty: 0 };
  const fx = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
  const fy = nodes.reduce((sum, node) => sum + node.top + node.height / 2, 0) / nodes.length;
  return { scale, tx: (size.width / 2 - fx) * PULL, ty: (size.height / 2 - fy) * PULL };
};

/** Where a stage point lands once the camera is applied (transform-origin is the stage's centre). */
const project = (point: Point, camera: Camera, size: Size): Point => ({
  x: size.width / 2 + (point.x - size.width / 2) * camera.scale + camera.tx,
  y: size.height / 2 + (point.y - size.height / 2) * camera.scale + camera.ty
});

const projectBox = (node: NodeBox, camera: Camera, size: Size): Box => {
  const from = project({ x: node.x - node.width / 2, y: node.top }, camera, size);
  const to = project({ x: node.x + node.width / 2, y: node.top + node.height }, camera, size);
  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
};

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

const Dot = ({ tone }: { tone: NonNullable<StageTag['dot']> }) => (
  <i aria-hidden="true" className={`sg-tag__dot sg-tag__dot--${tone}`} />
);

const LockIcon = () => (
  <svg className="sg-tag__icon" viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true">
    <rect x="2" y="5.2" width="8" height="5.6" rx="1.4" fill="currentColor" />
    <path d="M3.8 5.2V3.9a2.2 2.2 0 0 1 4.4 0v1.3" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const RepoIcon = () => (
  <svg className="sg-tag__icon" viewBox="0 0 12 12" width="11" height="11" fill="none" aria-hidden="true">
    <path
      d="M1.5 3.2A1.2 1.2 0 0 1 2.7 2h2.3l1.2 1.3h3.1a1.2 1.2 0 0 1 1.2 1.2v4.3A1.2 1.2 0 0 1 9.3 10H2.7a1.2 1.2 0 0 1-1.2-1.2z"
      fill="currentColor"
    />
  </svg>
);

const SPARK = sparkline([52, 48, 55, 61, 58, 66, 63, 70, 74, 68, 72, 78, 75, 80]);

const Spark = () => (
  <svg
    className="sg-tag__spark"
    viewBox="0 0 100 32"
    width="34"
    height="11"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polyline points={SPARK} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
  </svg>
);

const Face = ({ text, dot, icon }: { text: string; dot?: StageTag['dot']; icon?: StageTag['icon'] }) => (
  <>
    {dot ? <Dot tone={dot} /> : null}
    {icon === 'lock' ? <LockIcon /> : null}
    {icon === 'repo' ? <RepoIcon /> : null}
    {icon === 'spark' ? <Spark /> : null}
    <span className="sg-tag__text">{text}</span>
  </>
);

const Chip = ({ tag }: { tag: StageTag }) => {
  const className = ['sg-tag__chip', tag.tone && `sg-tag__chip--${tag.tone}`, tag.after && 'sg-tag__chip--swap']
    .filter(Boolean)
    .join(' ');
  if (!tag.after) {
    return (
      <span className={className}>
        <Face dot={tag.dot} icon={tag.icon} text={tag.text} />
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="sg-tag__face sg-tag__face--before">
        <Face dot={tag.dot} icon={tag.icon} text={tag.text} />
      </span>
      <span className="sg-tag__face sg-tag__face--after">
        <Face dot={tag.after.dot} text={tag.after.text} />
      </span>
    </span>
  );
};

/**
 * The stage: the real architecture diagram, pinned beside the six surfaces, with small HTML tags
 * anchored to its nodes. Which chapter is showing is decided here from the surfaces' positions and
 * written to `data-chapter` on the sticky container; the stylesheet turns that into the visible
 * tags, the bar's word and the colour of the light. Only the camera (a transform on the diagram) and
 * the tags' positions are React state.
 *
 * Every chapter's tags are always in the DOM. They all move with the camera, so a tag that fades in
 * while the model is still turning arrives together with its node.
 */
export default function Stage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const roots = useRef(new Map<string, HTMLDivElement>());
  const [measured, setMeasured] = useState<Model | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [chapter, setChapter] = useState(0);
  const [still, setStill] = useState(false);

  // The preference decides the connector dots, the camera and (through CSS) every transition.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  // Measure the nodes as soon as they exist, again whenever the stage changes size.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const attempt = () => {
      const next = readModel(host);
      setSize({ width: host.clientWidth, height: host.clientHeight });
      if (!next) return false;
      prepareDiagram(host, next);
      setMeasured(next);
      return true;
    };

    let tries = 0;
    const timer = attempt()
      ? 0
      : window.setInterval(() => {
          if (attempt() || ++tries > 25) window.clearInterval(timer);
        }, 200);

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => attempt());
    observer?.observe(host);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, []);

  // The active chapter: the last surface whose top has passed 45% of the viewport. Below 1000px the
  // stage sits once under the hero and shows chapter 01.
  useEffect(() => {
    const host = hostRef.current;
    const stage = host?.closest<HTMLElement>('[data-sg-stage]');
    const surfaces = Array.from(document.querySelectorAll<HTMLElement>('[data-sg-chapter]'));
    const narrow = window.matchMedia('(max-width: 999px)');
    let frame = 0;

    const compute = () => {
      frame = 0;
      let active = 0;
      if (narrow.matches) {
        active = 1;
      } else {
        const line = window.innerHeight * 0.45;
        for (const surface of surfaces) {
          if (surface.getBoundingClientRect().top <= line) active = Number(surface.dataset.sgChapter) || 0;
        }
      }
      setChapter(active);
      if (stage) stage.dataset.chapter = String(active);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    narrow.addEventListener('change', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      narrow.removeEventListener('change', schedule);
    };
  }, []);

  const model = measured ?? (size.width ? fallbackModel(size) : null);
  const camera = model ? cameraFor(chapter, model, size, still) : IDENTITY;

  // Chips must never cover each other, and should not cover another node either. Each chip tries
  // the roof first, shifted sideways before lifted, and takes the placement that overlaps least; a
  // second chip on the same node stacks above the first at a 26px pitch. Each chapter is laid out
  // under its own camera, so this runs on measurement, not on every chapter change.
  useLayoutEffect(() => {
    if (!model || !size.width) return;
    for (const entry of CHAPTERS) {
      const view = cameraFor(entry.index, model, size, still);
      const placed: Box[] = [];
      const stacks = new Map<string, number>();
      const items = entry.tags
        .map((tag, index) => ({ tag, index, key: `${entry.index}-${index}`, node: model.nodes.get(tag.anchor) }))
        .filter((item): item is typeof item & { node: NodeBox } => item.tag.anchor !== 'corner' && Boolean(item.node))
        .map((item) => Object.assign({}, item, { at: project({ x: item.node.x, y: item.node.top }, view, size) }))
        .toSorted((a, b) => b.at.y - a.at.y || a.index - b.index);

      for (const item of items) {
        const root = roots.current.get(item.key);
        const chip = root?.querySelector<HTMLElement>('.sg-tag__chip');
        if (!root || !chip) continue;
        const width = chip.offsetWidth;
        const height = chip.offsetHeight;
        const obstacles = Array.from(model.nodes.entries())
          .filter(([id]) => id !== item.tag.anchor)
          .map(([, node]) => projectBox(node, view, size));
        const stacked = stacks.get(item.tag.anchor);
        const reach = Math.max(0, width / 2 - 14);
        const shifts = stacked === undefined ? [0, -width / 4, width / 4, -reach, reach] : [stacked];
        // On a small stage the nodes sit too close for a chip to clear its neighbours: there it
        // stays by its roof and accepts a corner of overlap rather than climbing off the model.
        const compact = size.width < 560;
        const steps = compact ? 2 : 3;
        const lifts = Array.from(
          { length: steps },
          (_, step) => LIFT + STACK * (step + (stacked === undefined ? 0 : 1))
        );
        const obstacleWeight = compact ? 0.3 : 1;

        let best = { lift: LIFT, shift: 0, penalty: Number.POSITIVE_INFINITY };
        for (const lift of lifts) {
          for (const wanted of shifts) {
            const left = item.at.x + wanted - width / 2;
            const right = item.at.x + wanted + width / 2;
            const shift =
              left < EDGE
                ? wanted + (EDGE - left)
                : right > size.width - EDGE
                  ? wanted - (right - size.width + EDGE)
                  : wanted;
            const box: Box = {
              x1: item.at.x + shift - width / 2 - 2,
              x2: item.at.x + shift + width / 2 + 2,
              y1: item.at.y - lift - height - 1,
              y2: item.at.y - lift + 1
            };
            let penalty = (lift - LIFT) * 0.5 + Math.abs(shift) * 0.15;
            if (box.y1 < EDGE) penalty += 1e6;
            for (const other of placed) penalty += overlap(box, other) * 3;
            for (const obstacle of obstacles) penalty += overlap(box, obstacle) * obstacleWeight;
            if (penalty < best.penalty) best = { lift, shift, penalty };
          }
        }

        placed.push({
          x1: item.at.x + best.shift - width / 2 - 2,
          x2: item.at.x + best.shift + width / 2 + 2,
          y1: item.at.y - best.lift - height - 1,
          y2: item.at.y - best.lift + 1
        });
        root.style.setProperty('--lift', `${best.lift}px`);
        root.style.setProperty('--shift', `${best.shift.toFixed(1)}px`);
        root.style.setProperty('--lead', stacked === undefined ? `${best.lift}px` : '0px');
        if (stacked === undefined) stacks.set(item.tag.anchor, best.shift);
      }
    }
  }, [model, size, still]);

  const register = (key: string) => (element: HTMLDivElement | null) => {
    if (element) roots.current.set(key, element);
    else roots.current.delete(key);
  };

  return (
    <>
      <div className="sg-scene">
        <div
          ref={hostRef}
          className="sg-diagram"
          style={{
            transform: `translate(${camera.tx.toFixed(1)}px, ${camera.ty.toFixed(1)}px) scale(${camera.scale.toFixed(3)})`
          }}
        >
          <IsometricDiagram
            animateConnectors={!still}
            ariaLabel={DIAGRAM_LABEL}
            config={CONFIG}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      <div className="sg-overlay" aria-hidden="true">
        {CHAPTERS.map((entry) =>
          entry.tags.map((tag, index) => {
            const key = `${entry.index}-${index}`;
            if (tag.anchor === 'corner') {
              return (
                <div key={key} className="sg-tag sg-tag--corner" data-ch={entry.index}>
                  <Chip tag={tag} />
                </div>
              );
            }
            const node = model?.nodes.get(tag.anchor);
            if (!node) return null;
            const at = project({ x: node.x, y: node.top }, camera, size);
            return (
              <div
                key={key}
                ref={register(key)}
                className="sg-tag"
                data-ch={entry.index}
                style={{ transform: `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)` }}
              >
                <i className="sg-tag__lead" />
                <Chip tag={tag} />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
