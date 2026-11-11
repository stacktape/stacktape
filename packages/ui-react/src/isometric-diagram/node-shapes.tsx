/**
 * Isometric node shapes.
 *
 * Every resource kind has its own silhouette drawn around its tile: databases are true 2:1 cylinders, a bucket is an
 * open bucket, a queue is a trough of queued messages, a container service is a plate with one cube per running task.
 * The body is painted in the AWS category colour; side faces are the same colour shaded towards a dark base, so a
 * shape reads as one solid object on the dark canvas. At most one flat, single-colour glyph sits on a top face.
 *
 * Shapes are drawn back to front inside themselves; the renderer orders whole nodes by depth.
 */
import type { ReactElement, ReactNode } from 'react';
import type { ScreenPoint } from './projection.js';
import type { IsoNode, IsoNodeCategory, IsoNodeGlyph, IsoNodeAccess } from './scene.js';
import { BADGE_OFFSET_PX, EXPOSURE_BADGE_TEXT, getReplicaBadgeText, SHAPE_HEIGHT_PX } from './node-appearance.js';
import { lift, pts, round, t2s, TH, TW } from './projection.js';

// AWS category colours, tuned so the top face, both side faces and a white glyph all stay distinct on the dark
// canvas. They are literal because faces are shaded arithmetically from them.
export const CATEGORY_COLORS: Record<IsoNodeCategory, string> = {
  compute: '#F08A24',
  database: '#4F76F2',
  integration: '#E44B82',
  storage: '#5DA83C',
  network: '#8F5EEC',
  security: '#E2484E',
  neutral: '#A3AEBF'
};

const GLYPH_COLOR = '#FFFFFF';
const FONT = "'Montserrat', 'Inter', sans-serif";

const channels = (color: string) => [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));

/** Mixes a colour towards a dark base: 1 keeps it, 0 is the base. */
export const shade = (color: string, factor: number) => {
  const base = 18;
  const [r, g, b] = channels(color).map((value) => Math.round(base + (value - base) * factor));
  return `rgb(${r},${g},${b})`;
};

/** Mixes a colour towards white: 0 keeps it, 1 is white. */
export const tint = (color: string, factor: number) => {
  const [r, g, b] = channels(color).map((value) => Math.round(value + (255 - value) * factor));
  return `rgb(${r},${g},${b})`;
};

/** Converts `rgb(r,g,b)` back to hex so a shaded colour can be shaded again. */
const toHex = (color: string) => {
  if (color.startsWith('#')) return color;
  const values = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

// Tile-unit radius → SVG ellipse radii of a circle lying on the floor.
const RX = (TW / 2) * Math.SQRT2;
const RY = (TH / 2) * Math.SQRT2;

type DrawContext = {
  /** Unique, diagram-scoped prefix for this node's SVG ids (gradients). */
  idBase: string;
  shadowFilterId: string;
  parts: ReactNode[];
  gradients: number;
};

const push = (context: DrawContext, element: ReactElement) => {
  context.parts.push(element);
};

const key = (context: DrawContext) => `p${context.parts.length}`;

// ── Primitives ──

const squareShadow = (context: DrawContext, cx: number, cy: number, sx: number, sy = sx) => {
  const spread = 0.18;
  push(
    context,
    <polygon
      key={key(context)}
      points={pts(
        t2s(cx - sx - spread, cy - sy - spread),
        t2s(cx + sx + spread, cy - sy - spread),
        t2s(cx + sx + spread, cy + sy + spread),
        t2s(cx - sx - spread, cy + sy + spread)
      )}
      fill="rgba(0,0,0,0.42)"
      filter={`url(#${context.shadowFilterId})`}
      transform="translate(0,4)"
    />
  );
};

const roundShadow = (context: DrawContext, cx: number, cy: number, r: number) => {
  const center = t2s(cx, cy);
  push(
    context,
    <ellipse
      key={key(context)}
      cx={center.x}
      cy={center.y + 4}
      rx={RX * (r + 0.16)}
      ry={RY * (r + 0.16)}
      fill="rgba(0,0,0,0.42)"
      filter={`url(#${context.shadowFilterId})`}
    />
  );
};

/** Axis-aligned box: half-extents `sx` along tile x and `sy` along tile y, from height `z0` to `z0 + h`. */
const box = (
  context: DrawContext,
  {
    cx,
    cy,
    sx,
    sy = sx,
    h,
    z0 = 0,
    color,
    top,
    edges = true
  }: {
    cx: number;
    cy: number;
    sx: number;
    sy?: number;
    h: number;
    z0?: number;
    color: string;
    top?: string | undefined;
    edges?: boolean;
  }
) => {
  const front = t2s(cx - sx, cy - sy);
  const right = t2s(cx + sx, cy - sy);
  const back = t2s(cx + sx, cy + sy);
  const left = t2s(cx - sx, cy + sy);
  const z1 = z0 + h;
  const hex = toHex(color);
  push(
    context,
    <g key={key(context)}>
      <polygon points={pts(lift(left, z1), lift(front, z1), lift(front, z0), lift(left, z0))} fill={shade(hex, 0.78)} />
      <polygon
        points={pts(lift(front, z1), lift(right, z1), lift(right, z0), lift(front, z0))}
        fill={shade(hex, 0.58)}
      />
      <polygon points={pts(lift(front, z1), lift(right, z1), lift(back, z1), lift(left, z1))} fill={top ?? hex} />
      {edges && (
        <polyline
          points={pts(lift(left, z1), lift(front, z1), lift(right, z1))}
          fill="none"
          stroke={tint(hex, 0.45)}
          strokeWidth={1}
          strokeLinejoin="round"
          opacity={0.75}
        />
      )}
    </g>
  );
};

/** Upright cylinder of radius `r` tiles (`rTop` for a cone), from `z0` to `z0 + h`, with seam rings at height fractions. */
const cylinder = (
  context: DrawContext,
  {
    cx,
    cy,
    r,
    rTop = r,
    h,
    z0 = 0,
    color,
    rings = [],
    topColor
  }: {
    cx: number;
    cy: number;
    r: number;
    rTop?: number;
    h: number;
    z0?: number;
    color: string;
    rings?: number[];
    topColor?: string;
  }
) => {
  const center = t2s(cx, cy);
  const rx = RX * r;
  const ry = RY * r;
  const rxTop = RX * rTop;
  const ryTop = RY * rTop;
  const bottom = center.y - z0;
  const top = center.y - z0 - h;
  const hex = toHex(color);
  const gradientId = `${context.idBase}-g${context.gradients++}`;
  const side = `M ${round(center.x - rxTop)} ${round(top)} L ${round(center.x - rx)} ${round(bottom)} A ${round(rx)} ${round(ry)} 0 0 0 ${round(center.x + rx)} ${round(bottom)} L ${round(center.x + rxTop)} ${round(top)} A ${round(rxTop)} ${round(ryTop)} 0 0 1 ${round(center.x - rxTop)} ${round(top)} Z`;
  push(
    context,
    <g key={key(context)}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={shade(hex, 0.88)} />
          <stop offset="0.45" stopColor={shade(hex, 0.72)} />
          <stop offset="1" stopColor={shade(hex, 0.5)} />
        </linearGradient>
      </defs>
      <path d={side} fill={`url(#${gradientId})`} />
      {rings.map((fraction) => {
        const y = bottom - h * fraction;
        const ringRx = rx + (rxTop - rx) * fraction;
        const ringRy = ry + (ryTop - ry) * fraction;
        return (
          <g key={fraction}>
            <path
              d={`M ${round(center.x - ringRx)} ${round(y)} A ${round(ringRx)} ${round(ringRy)} 0 0 0 ${round(center.x + ringRx)} ${round(y)}`}
              fill="none"
              stroke={shade(hex, 0.42)}
              strokeWidth={1.6}
            />
            <path
              d={`M ${round(center.x - ringRx)} ${round(y + 1.6)} A ${round(ringRx)} ${round(ringRy)} 0 0 0 ${round(center.x + ringRx)} ${round(y + 1.6)}`}
              fill="none"
              stroke={tint(hex, 0.25)}
              strokeWidth={0.8}
              opacity={0.5}
            />
          </g>
        );
      })}
      <ellipse cx={center.x} cy={top} rx={rxTop} ry={ryTop} fill={topColor ?? hex} />
      <path
        d={`M ${round(center.x - rxTop)} ${round(top)} A ${round(rxTop)} ${round(ryTop)} 0 0 0 ${round(center.x + rxTop)} ${round(top)}`}
        fill="none"
        stroke={tint(hex, 0.45)}
        strokeWidth={1}
        opacity={0.75}
      />
    </g>
  );
};

// ── Glyphs ── drawn in a 24×24 box with white strokes; mapped onto a top face or drawn upright.

const GLYPH_SIZE = 24;
const stroke = {
  fill: 'none',
  stroke: GLYPH_COLOR,
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const;

const GLYPHS: Record<IsoNodeGlyph, ReactNode> = {
  lambda: <path d="M6 20 L12 8.5 M8 4 H11 L18 20 H20.5" {...stroke} strokeWidth={2.6} />,
  // Two-way arrows along the glyph's vertical, which is the flow direction on a top face.
  websocket: <path d="M8.5 20 V4.5 M5 8 L8.5 4.5 L12 8 M15.5 4 V19.5 M12 16 L15.5 19.5 L19 16" {...stroke} />,
  graphql: (
    <g {...stroke} strokeWidth={1.8}>
      <path d="M12 3 L19.8 7.5 V16.5 L12 21 L4.2 16.5 V7.5 Z" />
      <path d="M12 3 L19.8 16.5 H4.2 Z" />
    </g>
  ),
  mcp: <path d="M9 3 V8 M15 3 V8 M6 8 H18 V11 A6 6 0 0 1 6 11 Z M12 17 V21.5" {...stroke} />,
  leaf: <path d="M5 19.5 C5 10 11 4.5 20 4.5 C20 13 14.5 19.5 5 19.5 Z M5 19.5 L14 10.5" {...stroke} />,
  bolt: <path d="M13.5 2.5 L5 13.5 H11 L10 21.5 L19 10 H13 Z" fill={GLYPH_COLOR} />,
  table: (
    <g {...stroke} strokeWidth={1.8}>
      <rect x={3.5} y={4.5} width={17} height={15} rx={1.5} />
      <path d="M3.5 9.5 H20.5 M3.5 14.5 H20.5 M9.5 4.5 V19.5" />
    </g>
  ),
  search: <path d="M15 15 L20.5 20.5 M16 10 A6 6 0 1 1 4 10 A6 6 0 1 1 16 10 Z" {...stroke} />,
  browser: (
    <g {...stroke} strokeWidth={1.9}>
      <rect x={3} y={4.5} width={18} height={15} rx={2} />
      <path d="M3 9 H21" />
    </g>
  ),
  code: <path d="M8.5 6.5 L3 12 L8.5 17.5 M15.5 6.5 L21 12 L15.5 17.5 M13.5 4.5 L10.5 19.5" {...stroke} />,
  // Its points aim at the glyph box's corners, which land on the top face's corners: a four-point star on screen.
  spark: <path d="M3 3 L12 8.6 L21 3 L15.4 12 L21 21 L12 15.4 L3 21 L8.6 12 Z" fill={GLYPH_COLOR} />,
  memory: (
    <g {...stroke} strokeWidth={1.8}>
      <rect x={6} y={6} width={12} height={12} rx={1.5} />
      <path d="M9.5 6 V2.5 M14.5 6 V2.5 M9.5 18 V21.5 M14.5 18 V21.5 M6 9.5 H2.5 M6 14.5 H2.5 M18 9.5 H21.5 M18 14.5 H21.5" />
    </g>
  ),
  person: (
    <g fill={GLYPH_COLOR}>
      <circle cx={12} cy={8} r={4.2} />
      <path d="M3.5 21 C3.5 15.5 7.5 13 12 13 C16.5 13 20.5 15.5 20.5 21 Z" />
    </g>
  ),
  flow: (
    <g {...stroke} strokeWidth={1.9}>
      <rect x={3} y={3} width={7} height={7} rx={1} />
      <rect x={14} y={14} width={7} height={7} rx={1} />
      <path d="M6.5 10 V17.5 H14" />
    </g>
  )
};

/**
 * Lays a glyph flat on the floor plane at height `z`, centred on tile (cx, cy), `s` tiles from centre to edge. The
 * glyph's top-left corner sits on the face's back corner, its x axis runs down-right and its y axis down-left; the
 * flow direction (tile +x, up-right on screen) is the glyph's "up".
 */
const glyphOnTop = (
  context: DrawContext,
  {
    glyph,
    cx,
    cy,
    s,
    z,
    opacity = 0.95
  }: { glyph: IsoNodeGlyph; cx: number; cy: number; s: number; z: number; opacity?: number }
) => {
  const origin = lift(t2s(cx + s, cy + s), z);
  const alongX = lift(t2s(cx + s, cy - s), z);
  const alongY = lift(t2s(cx - s, cy + s), z);
  const matrix = [
    (alongX.x - origin.x) / GLYPH_SIZE,
    (alongX.y - origin.y) / GLYPH_SIZE,
    (alongY.x - origin.x) / GLYPH_SIZE,
    (alongY.y - origin.y) / GLYPH_SIZE,
    origin.x,
    origin.y
  ].map(round);
  push(
    context,
    <g key={key(context)} transform={`matrix(${matrix.join(',')})`} opacity={opacity}>
      {GLYPHS[glyph]}
    </g>
  );
};

const lineOnTop = (context: DrawContext, points: ScreenPoint[], width = 2) => {
  push(
    context,
    <polyline
      key={key(context)}
      points={pts(...points)}
      fill="none"
      stroke={GLYPH_COLOR}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.92}
    />
  );
};

const smallText = (context: DrawContext, point: ScreenPoint, text: string) => {
  push(
    context,
    <text
      key={key(context)}
      x={point.x}
      y={point.y + 0.5}
      textAnchor="middle"
      dominantBaseline="central"
      fill={GLYPH_COLOR}
      opacity={0.9}
      fontFamily={FONT}
      fontSize={8.5}
      fontWeight={700}
    >
      {text}
    </text>
  );
};

// ── Shapes ──

const MAX_TASK_SLOTS = 4;

const drawContainer = (context: DrawContext, node: IsoNode, color: string) => {
  const { x: cx, y: cy } = node.tile;
  const running = Math.min(node.replicas?.min ?? 1, MAX_TASK_SLOTS);
  const slots = Math.min(Math.max(node.replicas?.max ?? 1, running), MAX_TASK_SLOTS);
  squareShadow(context, cx, cy, 0.62);
  box(context, { cx, cy, sx: 0.64, h: 5, color: shade(color, 0.62), top: shade(color, 0.74) });
  if (slots === 1) {
    box(context, { cx, cy, sx: 0.36, h: 24, z0: 5, color, top: tint(color, 0.06) });
    return;
  }
  // A 2×2 grid of task slots, filled back to front: solid cubes run, dashed ones are capacity up to the maximum.
  const grid = [
    { x: 0.28, y: 0.28 },
    { x: -0.28, y: 0.28 },
    { x: 0.28, y: -0.28 },
    { x: -0.28, y: -0.28 }
  ];
  const ghost = tint(color, 0.2);
  grid.slice(0, slots).forEach((slot, index) => {
    const x = cx + slot.x;
    const y = cy + slot.y;
    if (index < running) {
      box(context, { cx: x, cy: y, sx: 0.2, h: 20, z0: 5, color, top: tint(color, 0.06) });
      return;
    }
    const corners = [t2s(x - 0.2, y - 0.2), t2s(x + 0.2, y - 0.2), t2s(x + 0.2, y + 0.2), t2s(x - 0.2, y + 0.2)];
    const [front, right, , left] = corners;
    push(
      context,
      <g key={key(context)} fill="none" stroke={ghost} strokeDasharray="3 3" strokeWidth={1}>
        <polygon points={pts(...corners.map((corner) => lift(corner, 25)))} opacity={0.75} />
        <polyline points={pts(lift(left, 25), lift(left, 5))} opacity={0.5} />
        <polyline points={pts(lift(front, 25), lift(front, 5))} opacity={0.5} />
        <polyline points={pts(lift(right, 25), lift(right, 5))} opacity={0.5} />
      </g>
    );
  });
};

const drawDatabase = (context: DrawContext, node: IsoNode, color: string) => {
  const { x: cx, y: cy } = node.tile;
  const instances = Math.min(node.replicas?.min ?? 1, 3);
  const height = SHAPE_HEIGHT_PX.database;
  if (instances === 1) {
    roundShadow(context, cx, cy, 0.5);
    cylinder(context, { cx, cy, r: 0.5, h: height, color, rings: [0.34, 0.67], topColor: tint(color, 0.08) });
    if (node.glyph) glyphOnTop(context, { glyph: node.glyph, cx, cy, s: 0.3, z: height });
    return;
  }
  // The writer and its readers stand side by side at equal depth, so none hides another.
  const step = instances === 2 ? 0.3 : 0.4;
  const r = instances === 2 ? 0.36 : 0.27;
  const offsets = instances === 2 ? [-step, step] : [-step, 0, step];
  squareShadow(context, cx, cy, 0.5, 0.5);
  offsets.forEach((offset, index) => {
    const x = cx + offset;
    const y = cy - offset;
    cylinder(context, {
      cx: x,
      cy: y,
      r,
      h: height - 2,
      color: index === 0 ? color : shade(color, 0.92),
      rings: [0.34, 0.67],
      topColor: index === 0 ? tint(color, 0.08) : color
    });
    smallText(context, lift(t2s(x, y), height - 2), index === 0 ? 'W' : 'R');
  });
};

const drawShape = (context: DrawContext, node: IsoNode) => {
  const { x: cx, y: cy } = node.tile;
  const color = CATEGORY_COLORS[node.category];
  const height = SHAPE_HEIGHT_PX[node.shape];
  const topColor = tint(color, 0.06);
  const glyph = node.glyph;
  const p = (dx: number, dy: number, z: number) => lift(t2s(cx + dx, cy + dy), z);

  switch (node.shape) {
    case 'function': {
      squareShadow(context, cx, cy, 0.44);
      box(context, { cx, cy, sx: 0.44, h: height, color, top: topColor });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.3, z: height });
      return;
    }
    case 'deck': {
      // A group of functions or batch jobs: a short stack of slabs, the top one in full colour with its glyph.
      squareShadow(context, cx, cy, 0.46);
      const slabs = 3;
      const slabHeight = 6;
      const step = (height - slabHeight) / (slabs - 1);
      for (let index = 0; index < slabs; index++) {
        const isTop = index === slabs - 1;
        box(context, {
          cx,
          cy,
          sx: 0.44,
          h: slabHeight,
          z0: index * step,
          color: isTop ? color : shade(color, 0.8 + index * 0.06),
          top: isTop ? topColor : shade(color, 0.9)
        });
      }
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.3, z: height });
      return;
    }
    case 'container':
      drawContainer(context, node, color);
      return;
    case 'batch': {
      // A tall box with grooves: a stack of jobs waiting for compute.
      squareShadow(context, cx, cy, 0.48);
      box(context, { cx, cy, sx: 0.48, h: 6, color: shade(color, 0.9) });
      box(context, { cx, cy, sx: 0.48, h: 6, z0: 8, color: shade(color, 0.95) });
      box(context, { cx, cy, sx: 0.48, h: 6, z0: 16, color, top: topColor });
      return;
    }
    case 'server': {
      squareShadow(context, cx, cy, 0.36);
      box(context, { cx, cy, sx: 0.36, h: height, color, top: topColor });
      for (const z of [8, 14, 20]) lineOnTop(context, [p(-0.22, -0.36, z), p(0.22, -0.36, z)], 1.4);
      return;
    }
    case 'agent': {
      squareShadow(context, cx, cy, 0.46);
      box(context, { cx, cy, sx: 0.46, h: height, color, top: topColor });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.3, z: height });
      return;
    }
    case 'tool': {
      squareShadow(context, cx, cy, 0.42);
      box(context, { cx, cy, sx: 0.42, h: height, color, top: topColor });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.3, z: height });
      return;
    }
    case 'construct': {
      // Building blocks: two cubes on the floor and one on top.
      squareShadow(context, cx, cy, 0.46);
      box(context, { cx: cx + 0.22, cy: cy + 0.2, sx: 0.22, h: 13, color });
      box(context, { cx: cx - 0.22, cy: cy + 0.2, sx: 0.22, h: 13, color: shade(color, 0.94) });
      box(context, { cx: cx + 0.02, cy: cy - 0.22, sx: 0.22, h: 13, color: shade(color, 0.97) });
      box(context, { cx: cx + 0.1, cy: cy + 0.06, sx: 0.22, h: 13, z0: 13, color, top: topColor });
      return;
    }
    case 'database':
      drawDatabase(context, node, color);
      return;
    case 'key-value': {
      // A wide, low table: two stacked discs.
      roundShadow(context, cx, cy, 0.6);
      cylinder(context, { cx, cy, r: 0.6, h: 8, color: shade(color, 0.9) });
      cylinder(context, { cx, cy, r: 0.6, h: 8, z0: 11, color, topColor: tint(color, 0.08) });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.32, z: 19 });
      return;
    }
    case 'cache':
    case 'search': {
      const r = node.shape === 'cache' ? 0.46 : 0.48;
      roundShadow(context, cx, cy, r);
      cylinder(context, { cx, cy, r, h: height, color, rings: [0.5], topColor: tint(color, 0.08) });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.28, z: height });
      return;
    }
    case 'queue': {
      // A trough with messages queued along the flow axis.
      squareShadow(context, cx, cy, 0.7, 0.3);
      box(context, { cx, cy, sx: 0.72, sy: 0.32, h: 6, color: shade(color, 0.62), top: shade(color, 0.5) });
      for (const dx of [0.48, 0.16, -0.16, -0.48]) {
        box(context, { cx: cx + dx, cy, sx: 0.12, sy: 0.24, h: 14, z0: 6, color, top: tint(color, 0.1) });
      }
      return;
    }
    case 'topic': {
      // A disc fanning out to its subscribers.
      roundShadow(context, cx, cy, 0.5);
      cylinder(context, { cx, cy, r: 0.5, h: height, color, topColor });
      const hub = p(0, 0, height);
      for (let index = 0; index < 6; index++) {
        const angle = (index / 6) * Math.PI * 2 + 0.3;
        const spoke = p(Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, height);
        lineOnTop(context, [hub, spoke], 1.4);
        push(context, <ellipse key={key(context)} cx={spoke.x} cy={spoke.y} rx={3.2} ry={1.9} fill={GLYPH_COLOR} />);
      }
      push(context, <ellipse key={key(context)} cx={hub.x} cy={hub.y} rx={5} ry={2.8} fill={GLYPH_COLOR} />);
      return;
    }
    case 'stream': {
      // Three staggered lanes of records moving along the flow axis.
      squareShadow(context, cx, cy, 0.7, 0.4);
      box(context, { cx, cy, sx: 0.72, sy: 0.42, h: 4, color: shade(color, 0.62), top: shade(color, 0.5) });
      const lanes = [
        { dy: 0.24, shift: 0.1 },
        { dy: 0, shift: -0.12 },
        { dy: -0.24, shift: 0.04 }
      ];
      for (const lane of lanes) {
        for (const dx of [0.42, 0, -0.42]) {
          box(context, {
            cx: cx + dx + lane.shift,
            cy: cy + lane.dy,
            sx: 0.14,
            sy: 0.08,
            h: 8,
            z0: 4,
            color,
            top: tint(color, 0.1),
            edges: false
          });
        }
      }
      return;
    }
    case 'workflow': {
      squareShadow(context, cx, cy, 0.5);
      box(context, { cx, cy, sx: 0.5, h: height, color, top: topColor });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.32, z: height });
      return;
    }
    case 'schedule': {
      // A clock face.
      roundShadow(context, cx, cy, 0.4);
      cylinder(context, { cx, cy, r: 0.4, h: height, color, topColor });
      const center = t2s(cx, cy);
      push(
        context,
        <ellipse
          key={key(context)}
          cx={center.x}
          cy={center.y - height}
          rx={RX * 0.3}
          ry={RY * 0.3}
          fill="none"
          stroke={GLYPH_COLOR}
          strokeOpacity={0.85}
          strokeWidth={1.4}
        />
      );
      lineOnTop(context, [p(0.2, 0, height), p(0, 0, height), p(0, -0.13, height)], 1.8);
      return;
    }
    case 'email': {
      // An envelope lying flat, its flap folded towards the centre.
      squareShadow(context, cx, cy, 0.5, 0.36);
      box(context, { cx, cy, sx: 0.5, sy: 0.36, h: height, color, top: topColor });
      lineOnTop(context, [p(0.5, 0.36, height), p(0.02, 0, height), p(0.5, -0.36, height)], 1.6);
      return;
    }
    case 'bucket': {
      // An open bucket: a truncated cone with a dark inside.
      roundShadow(context, cx, cy, 0.42);
      cylinder(context, { cx, cy, r: 0.4, rTop: 0.54, h: height, color, rings: [0.82], topColor: shade(color, 0.45) });
      const rim = lift(t2s(cx, cy), height);
      push(
        context,
        <g key={key(context)}>
          <ellipse
            cx={rim.x}
            cy={rim.y}
            rx={RX * 0.54}
            ry={RY * 0.54}
            fill="none"
            stroke={tint(color, 0.35)}
            strokeWidth={2}
          />
          <ellipse cx={rim.x} cy={rim.y + 2} rx={RX * 0.46} ry={RY * 0.42} fill={shade(color, 0.32)} />
        </g>
      );
      return;
    }
    case 'filesystem': {
      squareShadow(context, cx, cy, 0.5);
      for (const z0 of [0, 7, 14]) {
        box(context, {
          cx,
          cy,
          sx: 0.5,
          h: 5,
          z0,
          color: z0 === 14 ? color : shade(color, 0.9),
          top: z0 === 14 ? topColor : undefined
        });
      }
      return;
    }
    case 'api': {
      // A gate the traffic passes through: two pillars and a lintel on a base plate.
      squareShadow(context, cx, cy, 0.4, 0.62);
      box(context, { cx, cy, sx: 0.4, sy: 0.64, h: 4, color: shade(color, 0.6), top: shade(color, 0.72) });
      box(context, { cx, cy: cy + 0.48, sx: 0.14, sy: 0.14, h: 26, z0: 4, color });
      if (glyph) glyphOnTop(context, { glyph, cx: cx - 0.06, cy, s: 0.25, z: 4 });
      box(context, { cx, cy: cy - 0.48, sx: 0.14, sy: 0.14, h: 26, z0: 4, color });
      box(context, { cx, cy, sx: 0.17, sy: 0.64, h: 8, z0: 30, color, top: tint(color, 0.08) });
      return;
    }
    case 'load-balancer': {
      // One stream in, fanned out to several targets.
      squareShadow(context, cx, cy, 0.56);
      box(context, { cx, cy, sx: 0.56, h: height, color, top: topColor });
      const fork = p(-0.05, 0, height);
      lineOnTop(context, [p(-0.4, 0, height), fork]);
      for (const dy of [0.3, 0, -0.3]) {
        const out = p(0.38, dy, height);
        lineOnTop(context, [fork, out]);
        push(context, <circle key={key(context)} cx={out.x} cy={out.y} r={2.4} fill={GLYPH_COLOR} />);
      }
      return;
    }
    case 'cdn': {
      // A dome with meridians: the global edge network.
      roundShadow(context, cx, cy, 0.5);
      const center = t2s(cx, cy);
      const rx = RX * 0.5;
      const ry = RY * 0.5;
      const domeHeight = height - 1;
      const gradientId = `${context.idBase}-g${context.gradients++}`;
      push(
        context,
        <g key={key(context)}>
          <defs>
            <radialGradient id={gradientId} cx="0.35" cy="0.3" r="0.9">
              <stop offset="0" stopColor={tint(color, 0.25)} />
              <stop offset="0.6" stopColor={color} />
              <stop offset="1" stopColor={shade(color, 0.55)} />
            </radialGradient>
          </defs>
          <path
            d={`M ${round(center.x - rx)} ${round(center.y)} A ${round(rx)} ${round(ry)} 0 0 0 ${round(center.x + rx)} ${round(center.y)} A ${round(rx)} ${domeHeight + 2} 0 0 0 ${round(center.x - rx)} ${round(center.y)} Z`}
            fill={`url(#${gradientId})`}
          />
          <g fill="none" stroke={GLYPH_COLOR} strokeOpacity={0.45} strokeWidth={1}>
            <path
              d={`M ${round(center.x)} ${round(center.y + ry)} A ${round(rx * 0.45)} ${round(domeHeight + ry)} 0 0 1 ${round(center.x)} ${round(center.y - domeHeight)}`}
            />
            <path
              d={`M ${round(center.x)} ${round(center.y + ry)} A ${round(rx * 0.45)} ${round(domeHeight + ry)} 0 0 0 ${round(center.x)} ${round(center.y - domeHeight)}`}
            />
            <path
              d={`M ${round(center.x - rx * 0.86)} ${round(center.y - domeHeight * 0.5)} A ${round(rx * 0.86)} ${round(ry * 0.86)} 0 0 0 ${round(center.x + rx * 0.86)} ${round(center.y - domeHeight * 0.5)}`}
            />
          </g>
        </g>
      );
      return;
    }
    case 'nat': {
      // One slab per NAT gateway or instance, side by side.
      const count = Math.min(node.replicas?.min ?? 1, 3);
      const sx = count === 1 ? 0.4 : 0.26;
      const step = count === 1 ? 0 : count === 2 ? 0.3 : 0.4;
      const offsets = count === 1 ? [0] : count === 2 ? [-step, step] : [-step, 0, step];
      squareShadow(context, cx, cy, count === 1 ? 0.4 : 0.5);
      for (const offset of offsets) {
        const x = cx + offset;
        const y = cy - offset;
        const q = (dx: number, dy: number) => lift(t2s(x + dx, y + dy), height);
        box(context, { cx: x, cy: y, sx, h: height, color, top: topColor });
        const reach = sx * 0.65;
        lineOnTop(context, [q(-reach, 0), q(reach, 0)], count === 1 ? 2 : 1.6);
        lineOnTop(
          context,
          [q(reach * 0.35, reach * 0.55), q(reach, 0), q(reach * 0.35, -reach * 0.55)],
          count === 1 ? 2 : 1.6
        );
      }
      return;
    }
    case 'firewall': {
      // A wall across the flow, with brick courses on its visible face.
      squareShadow(context, cx, cy, 0.14, 0.6);
      box(context, { cx, cy, sx: 0.12, sy: 0.62, h: height, color, top: tint(color, 0.1) });
      for (let course = 1; course < 4; course++) {
        const z = (height * course) / 4;
        push(
          context,
          <line
            key={key(context)}
            x1={p(-0.12, 0.62, z).x}
            y1={p(-0.12, 0.62, z).y}
            x2={p(-0.12, -0.62, z).x}
            y2={p(-0.12, -0.62, z).y}
            stroke={shade(color, 0.45)}
            strokeWidth={1.2}
          />
        );
        const offset = course % 2 === 0 ? 0.31 : 0;
        for (const dy of [0.31 - offset, -0.31 + offset].filter((value, index, all) => all.indexOf(value) === index)) {
          const from = p(-0.12, dy, z);
          const to = p(-0.12, dy, z + height / 4);
          push(
            context,
            <line
              key={key(context)}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={shade(color, 0.45)}
              strokeWidth={1}
            />
          );
        }
      }
      return;
    }
    case 'user-pool': {
      squareShadow(context, cx, cy, 0.42);
      box(context, { cx, cy, sx: 0.42, h: height, color, top: topColor });
      if (glyph) glyphOnTop(context, { glyph, cx, cy, s: 0.28, z: height });
      return;
    }
    case 'user': {
      roundShadow(context, cx, cy, 0.38);
      cylinder(context, { cx, cy, r: 0.38, h: 5, color: shade(color, 0.7) });
      const base = lift(t2s(cx, cy), 5);
      push(
        context,
        <g key={key(context)}>
          <path
            d={`M ${round(base.x - 13)} ${round(base.y - 2)} C ${round(base.x - 13)} ${round(base.y - 22)}, ${round(base.x + 13)} ${round(base.y - 22)}, ${round(base.x + 13)} ${round(base.y - 2)} Z`}
            fill={color}
          />
          <circle cx={base.x} cy={base.y - 29} r={8.5} fill={tint(color, 0.2)} />
        </g>
      );
      return;
    }
  }
};

/** Draws a node's body. Ids for gradients are scoped by `idBase`, so several diagrams can share a page. */
export function NodeShape({ node, idBase, shadowFilterId }: { node: IsoNode; idBase: string; shadowFilterId: string }) {
  const context: DrawContext = { idBase, shadowFilterId, parts: [], gradients: 0 };
  drawShape(context, node);
  return <g data-iso-shape={node.shape}>{context.parts}</g>;
}

// ── Badges ── flat, screen-space pills drawn just above a shape.

const Pill = ({
  x,
  y,
  text,
  fill,
  stroke: strokeColor
}: {
  x: number;
  y: number;
  text: string;
  fill: string;
  stroke: string;
}) => {
  const width = Math.max(18, text.length * 6 + 10);
  return (
    <g>
      <rect
        x={x - width / 2}
        y={y - 8.5}
        width={width}
        height={17}
        rx={8.5}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F1F4F8"
        fontFamily={FONT}
        fontSize={10}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
};

const ACCESS_TAG_STYLE = {
  exposed: { fill: '#C9363C', stroke: '#F06A6F', text: '#FFFFFF' },
  public: { fill: '#10202B', stroke: '#6FB6D9', text: '#DDF1FB' },
  limited: { fill: '#0B0D12', stroke: '#566173', text: '#C3CCD8' }
} as const;

/** The Access layer's tag: a globe when the internet can reach the node, a padlock when it cannot, then who can. */
const AccessTag = ({
  x,
  y,
  access,
  anchor
}: {
  x: number;
  y: number;
  access: IsoNodeAccess;
  anchor: 'middle' | 'end';
}) => {
  const style = ACCESS_TAG_STYLE[access.reach];
  const textWidth = [...access.text].reduce(
    (sum, char) => sum + (char === ' ' || char === '.' || char === ',' ? 3.2 : /[A-Z0-9+]/.test(char) ? 6.9 : 5.7),
    0
  );
  const width = textWidth + 31;
  const left = anchor === 'middle' ? x - width / 2 : x - width;
  const iconX = left + 12;
  return (
    <g data-iso-kind="access-tag" data-iso-reach={access.reach}>
      <rect
        x={left}
        y={y - 9.5}
        width={width}
        height={19}
        rx={9.5}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1.2}
      />
      {access.reach === 'limited' ? (
        <g stroke={style.text} strokeWidth={1.3} fill="none" strokeLinecap="round">
          <path d={`M${iconX - 2.6} ${y - 1} v-2.2 a2.6 2.6 0 0 1 5.2 0 v2.2`} />
          <rect x={iconX - 4} y={y - 1} width={8} height={6} rx={1.4} fill={style.text} stroke="none" />
        </g>
      ) : (
        <g stroke={style.text} strokeWidth={1.1} fill="none">
          <circle cx={iconX} cy={y} r={4.6} />
          <ellipse cx={iconX} cy={y} rx={2} ry={4.6} />
          <path d={`M${iconX - 4.6} ${y} h9.2`} />
        </g>
      )}
      <text
        x={left + 21}
        y={y + 0.5}
        textAnchor="start"
        dominantBaseline="central"
        fill={style.text}
        fontFamily={FONT}
        fontSize={10.5}
        fontWeight={700}
      >
        {access.text}
      </text>
    </g>
  );
};

export function NodeBadges({ node }: { node: IsoNode }) {
  const center = t2s(node.tile.x, node.tile.y);
  const badgeY = center.y - SHAPE_HEIGHT_PX[node.shape] - BADGE_OFFSET_PX;
  const replicaText = getReplicaBadgeText(node);
  const color = CATEGORY_COLORS[node.category];
  return (
    <>
      {replicaText && node.memberCount ? (
        <g data-iso-kind="group-count">
          <Pill x={center.x + 34} y={badgeY} text={replicaText} fill={shade(color, 0.7)} stroke={tint(color, 0.3)} />
        </g>
      ) : (
        replicaText && (
          <g data-iso-kind="replica-badge">
            <Pill x={center.x + 34} y={badgeY} text={replicaText} fill="#0B0D12" stroke={color} />
          </g>
        )
      )}
      {node.access && (
        <AccessTag
          x={replicaText ? center.x + 14 : center.x}
          y={badgeY - 9}
          access={node.access}
          anchor={replicaText ? 'end' : 'middle'}
        />
      )}
      {node.isPublic && !node.access && (
        <g data-iso-kind="public-badge">
          <Pill x={center.x - 30} y={badgeY} text="public" fill="#C9363C" stroke="#F06A6F" />
        </g>
      )}
      {node.exposure && !node.isPublic && !node.access && (
        <g data-iso-kind="exposure-badge" data-iso-exposure={node.exposure}>
          <Pill
            x={center.x - (node.exposure === 'internal' ? 22 : 34)}
            y={badgeY}
            text={EXPOSURE_BADGE_TEXT[node.exposure]}
            fill={node.exposure === 'internal' ? '#0B0D12' : '#3A2A0C'}
            stroke={node.exposure === 'internal' ? '#8E9AAB' : '#E8B03A'}
          />
        </g>
      )}
    </>
  );
}
