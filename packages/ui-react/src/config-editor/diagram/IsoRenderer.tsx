/**
 * Isometric diagram renderer with category-specific pedestal silhouettes.
 *
 * Each category renders as a beveled prism (see PEDESTAL_STYLE): tall near-cylinders
 * for databases, sharp boxes for compute, low slabs for gateways, squat drums for
 * storage, and so on. The roof is always painted with the AWS icon, expanded to crop
 * the icon's internal padding and clipped to the silhouette.
 * Non-AWS icons (user) are rendered upright.
 * All text (node names, zone tags, connector chips, tooltips) is flat screen-space,
 * drawn above the scene geometry — only the geometry itself is isometric.
 * Layout flows bottom-left (external) to top-right (data).
 */
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type {
  IsoConnector,
  IsoConnectorRoute,
  IsoLabel,
  IsoNode,
  IsoRectangle,
  IsoScene,
  IsoTilePoint,
  PedestalType
} from './scene.js';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { EDGE_SEMANTIC_LABELS } from './resource-explanations.js';

// Chrome colours come from `@stacktape/design-tokens`; the host loads the token CSS together with
// `@stacktape/ui-react/config-editor/diagram.css`. They are referenced as variables rather than
// imported values so a host can retheme the diagram without rebuilding this package. Scene colours
// (pedestal bodies, connector semantics keyed to AWS categories) stay literal — the shading maths
// below has to read their channels.
const TEXT_SUBTLE = 'var(--stp-text-subtle)';
const BRAND = 'var(--stp-color-brand)';

// ── Iso projection (2:1), flipped Y so flow goes bottom-left → top-right ──

const TW = 80; // tile width
const TH = 40; // tile height

const t2s = (tx: number, ty: number) => ({
  x: (tx - ty) * (TW / 2),
  y: -((tx + ty) * (TH / 2))
});

// Shade a color: f=1 is original, f=0.5 is halfway to a dark base (not black)
const dk = (hex: string, f: number) => {
  let r: number;
  let g: number;
  let b: number;
  if (hex.startsWith('rgb')) {
    const m = hex.match(/(\d+)/g);
    if (!m) return hex;
    [r, g, b] = m.map(Number);
  } else {
    r = Number.parseInt(hex.slice(1, 3), 16);
    g = Number.parseInt(hex.slice(3, 5), 16);
    b = Number.parseInt(hex.slice(5, 7), 16);
  }
  const base = 30;
  return `rgb(${Math.round(base + (r - base) * f)},${Math.round(base + (g - base) * f)},${Math.round(base + (b - base) * f)})`;
};

// ── Iso helpers ──

const BW = 1.32; // node block width in tile units (~15% larger than original 1.15)
const HW = BW / 2;

// Top face vertices. With flipped Y, the vertex with the largest (tx+ty) is now
// highest on screen (farthest from viewer), so we swap f/b so that f=front (closest to viewer).
const topFace = (cx: number, cy: number, lift: number) => {
  const rawF = t2s(cx + HW, cy + HW); // largest tx+ty → with flipped Y = highest on screen = back
  const rawR = t2s(cx + HW, cy - HW);
  const rawB = t2s(cx - HW, cy - HW); // smallest tx+ty → with flipped Y = lowest on screen = front
  const rawL = t2s(cx - HW, cy + HW);
  return {
    f: { x: rawB.x, y: rawB.y - lift }, // front = closest to viewer (lowest on screen)
    r: { x: rawL.x, y: rawL.y - lift }, // right visible face
    b: { x: rawF.x, y: rawF.y - lift }, // back = farthest from viewer (highest on screen)
    l: { x: rawR.x, y: rawR.y - lift } // left visible face
  };
};

const pts = (...ps: { x: number; y: number }[]) => ps.map((p) => `${p.x},${p.y}`).join(' ');

// ── Pedestal silhouettes ──
// Resource names live in flat tags below each node (never on the 3D body), so the
// silhouettes are free to differ for real: a tall ringed cylinder for databases, a
// cube for compute, a low slab for gateways, a squat drum for storage, faceted prisms
// for messaging/auth. The roof is always painted with the AWS icon. `seams` draws
// horizontal rings around the body at the given height fractions (cylinder look).
const PEDESTAL_STYLE: Record<PedestalType, { height: number; bevel: number; seams?: number[] }> = {
  compute: { height: 20, bevel: 0 },
  database: { height: 26, bevel: 0.32, seams: [0.33, 0.66] },
  gateway: { height: 11, bevel: 0 },
  messaging: { height: 20, bevel: 0.2 },
  storage: { height: 15, bevel: 0.26, seams: [0.5] },
  auth: { height: 22, bevel: 0.12 },
  user: { height: 20, bevel: 0 },
  default: { height: 20, bevel: 0 }
};

const getPedestalStyle = (ped?: PedestalType) => PEDESTAL_STYLE[ped || 'default'];

const MAX_PEDESTAL_H = 26;

type ScreenBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const getNodeScreenBounds = (node: IsoNode): ScreenBounds => {
  const origin = t2s(node.tile.x, node.tile.y);
  const halfWidth = (BW * TW) / 2 + 8;
  const iconTopPadding = node.isAwsIcon === false ? 24 : 8;

  return {
    minX: origin.x - halfWidth,
    maxX: origin.x + halfWidth,
    minY: origin.y - MAX_PEDESTAL_H - iconTopPadding,
    // Includes the name tag hanging below the front tip.
    maxY: origin.y + 26 + TH / 2
  };
};

const expandBounds = ({ bounds, padding }: { bounds: ScreenBounds; padding: number }): ScreenBounds => ({
  minX: bounds.minX - padding,
  maxX: bounds.maxX + padding,
  minY: bounds.minY - padding,
  maxY: bounds.maxY + padding
});

const mergeBounds = ({ bounds }: { bounds: ScreenBounds[] }) => {
  if (bounds.length === 0) {
    return { minX: -300, minY: -300, maxX: 300, maxY: 300 };
  }

  return {
    minX: Math.min(...bounds.map((value) => value.minX)),
    minY: Math.min(...bounds.map((value) => value.minY)),
    maxX: Math.max(...bounds.map((value) => value.maxX)),
    maxY: Math.max(...bounds.map((value) => value.maxY))
  };
};

const tilePointsToScreen = ({ points }: { points: IsoTilePoint[] }) => points.map((point) => t2s(point.x, point.y));

// ── Pedestals ──

const lerpScreenPoint = (from: { x: number; y: number }, to: { x: number; y: number }, fraction: number) => ({
  x: from.x + (to.x - from.x) * fraction,
  y: from.y + (to.y - from.y) * fraction
});

const insetFace = ({ top, amount = 0.16 }: { top: ReturnType<typeof topFace>; amount?: number }) => ({
  f: lerpScreenPoint(top.f, top.b, amount),
  r: lerpScreenPoint(top.r, top.l, amount),
  b: lerpScreenPoint(top.b, top.f, amount),
  l: lerpScreenPoint(top.l, top.r, amount)
});

// ── Generic beveled-prism pedestal ──
// A square footprint with per-category corner bevels approximates every silhouette
// from a sharp box (bevel 0) to a near-cylinder (bevel ~0.35). Side faces are drawn
// back-to-front with direction-based shading, so bevel corner faces pick up a middle
// tone that reads as a rounded body.

type TilePoint2 = { x: number; y: number };

const lerpPoint = (from: TilePoint2, to: TilePoint2, amount: number): TilePoint2 => ({
  x: from.x + (to.x - from.x) * amount,
  y: from.y + (to.y - from.y) * amount
});

// Footprint polygon in tile space (relative to node center), clockwise.
const beveledSquareFootprint = (bevel: number): TilePoint2[] => {
  const corners: TilePoint2[] = [
    { x: HW, y: HW },
    { x: HW, y: -HW },
    { x: -HW, y: -HW },
    { x: -HW, y: HW }
  ];
  if (bevel <= 0.01) return corners;

  const points: TilePoint2[] = [];
  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i];
    const previous = corners[(i + 3) % 4];
    const next = corners[(i + 1) % 4];
    points.push(lerpPoint(corner, previous, bevel), lerpPoint(corner, next, bevel));
  }
  return points;
};

// Shade factor for a side face from its outward normal (tile space). Calibrated so a
// square box keeps the original look: the face toward -y gets 0.55, toward -x gets 0.72.
const SHADE_MID = 0.635;
const SHADE_SPAN = 0.12;
const faceShade = (normal: TilePoint2) => {
  const length = Math.hypot(normal.x, normal.y) || 1;
  return SHADE_MID - SHADE_SPAN * ((normal.x - normal.y) / (length * Math.SQRT2));
};

const lerpScreen = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t
});

const PrismPedestal = ({ cx, cy, c, ped }: { cx: number; cy: number; c: string; ped: PedestalType }) => {
  const { height, bevel, seams } = getPedestalStyle(ped);
  const footprint = beveledSquareFootprint(bevel).map((p) => ({ x: cx + p.x, y: cy + p.y }));
  const topPoints = footprint.map((p) => {
    const s = t2s(p.x, p.y);
    return { x: s.x, y: s.y - height };
  });
  const botPoints = footprint.map((p) => t2s(p.x, p.y));

  const faces = footprint.map((p0, i) => {
    const j = (i + 1) % footprint.length;
    const p1 = footprint[j];
    const direction = { x: p1.x - p0.x, y: p1.y - p0.y };
    // Clockwise footprint → outward normal is direction rotated by +90°.
    const normal = { x: -direction.y, y: direction.x };
    return {
      polygon: pts(topPoints[i], topPoints[j], botPoints[j], botPoints[i]),
      corners: { topA: topPoints[i], topB: topPoints[j], botA: botPoints[i], botB: botPoints[j] },
      depth: p0.x + p0.y + p1.x + p1.y,
      shade: faceShade(normal)
    };
  });
  faces.sort((a, b) => b.depth - a.depth);

  return (
    <g>
      {faces.map((face, i) => (
        <g key={i}>
          <polygon
            points={face.polygon}
            fill={dk(c, face.shade)}
            stroke={dk(c, Math.max(0.4, face.shade - 0.1))}
            strokeWidth={0.6}
          />
          {/* Seam rings drawn per-face right after it, so nearer faces cover them
              correctly and the lines read as rings around the body. */}
          {seams?.map((fraction) => {
            const from = lerpScreen(face.corners.topA, face.corners.botA, fraction);
            const to = lerpScreen(face.corners.topB, face.corners.botB, fraction);
            return (
              <line
                key={fraction}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={dk(c, Math.max(0.35, face.shade - 0.16))}
                strokeWidth={1}
              />
            );
          })}
        </g>
      ))}
      <polygon points={pts(...topPoints)} fill={c} stroke={dk(c, 0.84)} strokeWidth={0.8} />
    </g>
  );
};

// Top face outline (screen points) used to clip the roof icon to the silhouette.
const prismTopPath = ({ cx, cy, ped }: { cx: number; cy: number; ped: PedestalType }) => {
  const { height, bevel } = getPedestalStyle(ped);
  return pts(
    ...beveledSquareFootprint(bevel).map((p) => {
      const s = t2s(cx + p.x, cy + p.y);
      return { x: s.x, y: s.y - height };
    })
  );
};

const FONT = "'Montserrat', 'Inter', sans-serif";

// ── Node name tag ──
// Flat, horizontal, hanging below the pedestal's front tip. All text in the diagram
// is screen-space; only the geometry is isometric — this keeps names readable
// regardless of pedestal shape.
const NodeNameTag = ({ cx, cy, text }: { cx: number; cy: number; text: string }) => {
  const maxChars = 20;
  const displayText = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  const tip = topFace(cx, cy, 0).f;

  return (
    <text
      x={tip.x}
      y={tip.y + 13}
      textAnchor="middle"
      dominantBaseline="central"
      fill="rgba(255,255,255,0.92)"
      stroke="rgba(9, 11, 17, 0.85)"
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      fontSize={10.5}
      fontFamily={FONT}
      fontWeight={600}
      letterSpacing={0.3}
    >
      {displayText}
    </text>
  );
};

// ── Node Block ──

const IsoNodeBlock = ({ idPrefix, node }: { idPrefix: string; node: IsoNode }) => {
  const c = node.color || '#cbd5e1';
  const o = t2s(node.tile.x, node.tile.y);
  const ped = node.pedestal || 'default';
  const ph = getPedestalStyle(ped).height;
  const replicaCount = Math.max(1, Math.min(node.replicaCount || 1, 9));

  // Icon transform: map the square image onto the top face, EXPANDED slightly beyond
  // the face and clipped back to the roof silhouette. AWS icons carry internal padding;
  // a small expansion trims it without zooming into the artwork itself.
  const ICON_BLEED = 0.02;
  const iSize = 40;
  const tf = topFace(node.tile.x, node.tile.y, ph);
  const iconTop = insetFace({ top: tf, amount: -ICON_BLEED });
  const roofPath = prismTopPath({ cx: node.tile.x, cy: node.tile.y, ped });
  const iA = (iconTop.l.x - iconTop.b.x) / iSize;
  const iB = (iconTop.l.y - iconTop.b.y) / iSize;
  const iC = (iconTop.r.x - iconTop.b.x) / iSize;
  const iD = (iconTop.r.y - iconTop.b.y) / iSize;
  const iTx = iconTop.b.x;
  const iTy = iconTop.b.y;

  // Clip shapes
  const clipId = `${idPrefix}-clip-${node.id}`;

  const shadowFace = insetFace({ top: topFace(node.tile.x, node.tile.y, 0), amount: -0.22 });

  return (
    <g>
      {/* Soft ground shadow for depth */}
      <polygon
        points={pts(shadowFace.f, shadowFace.r, shadowFace.b, shadowFace.l)}
        fill="rgba(0, 0, 0, 0.35)"
        filter={`url(#${idPrefix}-iso-shadow-blur)`}
        transform="translate(0, 3)"
      />
      {/* Pedestal */}
      <PrismPedestal cx={node.tile.x} cy={node.tile.y} c={c} ped={ped} />

      {/* Icon on the roof, clipped to the silhouette */}
      {node.iconUrl && node.isAwsIcon && (
        <>
          <defs>
            <clipPath id={clipId}>
              <polygon points={roofPath} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <g transform={`matrix(${iA},${iB},${iC},${iD},${iTx},${iTy})`}>
              <image href={node.iconUrl} x={0} y={0} width={iSize} height={iSize} />
            </g>
          </g>
        </>
      )}
      {/* Non-AWS icon: upright */}
      {node.iconUrl && !node.isAwsIcon && (
        <image href={node.iconUrl} x={o.x - 18} y={o.y - ph - 20} width={36} height={36} />
      )}

      {replicaCount > 1 && (
        <g>
          <circle
            cx={o.x + 36}
            cy={o.y - ph - 18}
            r={10}
            fill="rgba(9, 11, 17, 0.78)"
            stroke={dk(c, 0.95)}
            strokeWidth={1}
          />
          <text
            x={o.x + 36}
            y={o.y - ph - 18}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.9)"
            fontSize={9}
            fontFamily={FONT}
            fontWeight={700}
          >
            {`x${replicaCount}`}
          </text>
        </g>
      )}

      {/* Name tag below the front tip */}
      <NodeNameTag cx={node.tile.x} cy={node.tile.y} text={node.label} />
    </g>
  );
};

// ── Floor plane ──

const FloorPlane = ({
  rect,
  isHovered,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onClick
}: {
  rect: IsoRectangle;
  isHovered: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: (e: ReactPointerEvent) => void;
  onClick?: () => void;
}) => {
  const tl = t2s(rect.from.x, rect.from.y);
  const tr = t2s(rect.to.x, rect.from.y);
  const br = t2s(rect.to.x, rect.to.y);
  const bl = t2s(rect.from.x, rect.to.y);
  return (
    <polygon
      data-iso-kind="zone"
      data-iso-id={rect.id}
      points={pts(tl, tr, br, bl)}
      fill={rect.color}
      stroke={rect.borderColor}
      strokeWidth={isHovered ? 1.8 : 1}
      className="stp-diagram__zone"
      filter={isHovered ? 'brightness(1.6)' : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onClick={onClick}
    />
  );
};

// ── Grid ──

type TileRange = { minX: number; maxX: number; minY: number; maxY: number };

const IsoGrid = ({ range }: { range: TileRange }) => {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = range.minY; i <= range.maxY; i++) {
    const a = t2s(range.minX, i);
    const b = t2s(range.maxX, i);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  for (let i = range.minX; i <= range.maxX; i++) {
    const c = t2s(i, range.minY);
    const d = t2s(i, range.maxY);
    lines.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y });
  }
  return (
    <g>
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(54,190,190,0.06)" strokeWidth={0.5} />
      ))}
    </g>
  );
};

// ── Zone tag ──
// Horizontal name tag hanging just below a zone's front tip (the lowest vertex of its
// diamond). Rendered above all scene geometry, so it can never be occluded; nothing in
// the zone renders below its front tip either, so the tag always touches empty floor.
function ZoneTag({ label }: { label: IsoLabel }) {
  const tip = t2s(label.tile.x, label.tile.y);

  return (
    <text
      data-iso-kind="floor-label"
      data-iso-id={label.id}
      x={tip.x}
      y={tip.y + 14}
      textAnchor="middle"
      dominantBaseline="central"
      fill={label.color || TEXT_SUBTLE}
      stroke="rgba(9, 11, 17, 0.8)"
      strokeWidth={2.5}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      fontSize={label.fontSize || 11}
      fontFamily={FONT}
      fontWeight={700}
      letterSpacing={1.1}
      className="stp-diagram__zone-tag"
    >
      {label.text}
    </text>
  );
}

// ── Connector ──

// Pull the final route point back to the edge of the target node's floor tile so the
// arrowhead stays visible in front of the pedestal instead of being painted over by it.
const ARROW_CLEARANCE = HW + 0.14;

const trimRouteAtTarget = ({ points }: { points: IsoTilePoint[] }): IsoTilePoint[] => {
  if (points.length < 2) return points;

  const target = points[points.length - 1];
  const previous = points[points.length - 2];
  const dx = target.x - previous.x;
  const dy = target.y - previous.y;
  // Distance (in tile units, Chebyshev metric) from the previous point to the boundary
  // of the target's floor square. The floor tile maps to the screen diamond, so exiting
  // the square in tile space exits the diamond in screen space.
  const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
  if (chebyshev <= ARROW_CLEARANCE) return points;

  const t = 1 - ARROW_CLEARANCE / chebyshev;
  const trimmed = { x: previous.x + dx * t, y: previous.y + dy * t };
  return [...points.slice(0, -1), trimmed];
};

const getSemanticStyle = (semantic?: string) => {
  switch (semantic) {
    case 'request':
      return { strokeWidth: 2.2, strokeOpacity: 0.55, dashArray: undefined, color: BRAND };
    case 'event':
      return { strokeWidth: 2, strokeOpacity: 0.5, dashArray: undefined, color: '#FF9900' };
    case 'dependency':
      return { strokeWidth: 1.5, strokeOpacity: 0.35, dashArray: '6 4', color: BRAND };
    case 'egress':
      return { strokeWidth: 1.2, strokeOpacity: 0.3, dashArray: '4 4', color: '#A166FF' };
    default:
      return { strokeWidth: 2, strokeOpacity: 0.45, dashArray: undefined, color: BRAND };
  }
};

const getMarkerId = ({ idPrefix, semantic }: { idPrefix: string; semantic?: string | undefined }) => {
  const suffix = (() => {
    switch (semantic) {
      case 'event':
        return 'event';
      case 'dependency':
        return 'dependency';
      case 'egress':
        return 'egress';
      default:
        return 'request';
    }
  })();
  return `${idPrefix}-iso-arrow-${suffix}`;
};

const buildPath = ({ route }: { route: IsoConnectorRoute }): string => {
  const screenPoints = tilePointsToScreen({ points: route.points });
  if (screenPoints.length <= 1) return '';
  if (screenPoints.length === 2) {
    return `M ${screenPoints[0].x} ${screenPoints[0].y} L ${screenPoints[1].x} ${screenPoints[1].y}`;
  }

  const segments = [`M ${screenPoints[0].x} ${screenPoints[0].y}`];
  const r = 6;

  for (let index = 1; index < screenPoints.length; index++) {
    const current = screenPoints[index];
    const previous = screenPoints[index - 1];
    const next = screenPoints[index + 1];

    if (!next) {
      segments.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const inDx = current.x - previous.x;
    const inDy = current.y - previous.y;
    const inLen = Math.sqrt(inDx * inDx + inDy * inDy);
    const outDx = next.x - current.x;
    const outDy = next.y - current.y;
    const outLen = Math.sqrt(outDx * outDx + outDy * outDy);

    if (inLen < r * 2 || outLen < r * 2) {
      segments.push(`L ${current.x} ${current.y}`);
      continue;
    }

    segments.push(`L ${current.x - (inDx / inLen) * r} ${current.y - (inDy / inLen) * r}`);
    segments.push(
      `Q ${current.x} ${current.y} ${current.x + (outDx / outLen) * r} ${current.y + (outDy / outLen) * r}`
    );
  }

  return segments.join(' ');
};

const ConnSvg = ({
  conn,
  idPrefix,
  nodeMap,
  animateConnectors,
  dimmed,
  highlighted,
  onPointerEnter,
  onPointerLeave,
  onPointerMove
}: {
  conn: IsoConnector;
  idPrefix: string;
  nodeMap: Map<string, IsoNode>;
  animateConnectors: boolean;
  dimmed: boolean;
  highlighted: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: (e: ReactPointerEvent) => void;
}) => {
  const fn = nodeMap.get(conn.from);
  const tn = nodeMap.get(conn.to);
  if (!fn || !tn) return null;

  const path = buildPath({ route: { ...conn.route, points: trimRouteAtTarget({ points: conn.route.points }) } });
  const style = getSemanticStyle(conn.semantic);
  const cc = conn.color || style.color;

  return (
    <g className="stp-diagram__fade" opacity={dimmed ? 0.12 : 1}>
      <path
        data-iso-kind="connector-path"
        data-iso-id={conn.id}
        d={path}
        fill="none"
        stroke={cc}
        strokeWidth={highlighted ? style.strokeWidth + 0.8 : style.strokeWidth}
        strokeOpacity={highlighted ? Math.min(1, style.strokeOpacity + 0.35) : style.strokeOpacity}
        strokeLinecap="round"
        strokeDasharray={style.dashArray}
        markerEnd={`url(#${getMarkerId({ idPrefix, semantic: conn.semantic })})`}
      />
      {/* Invisible wide path so the thin pipe is easy to hover */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      />
      {animateConnectors && conn.semantic !== 'egress' && (
        <circle className="stp-diagram__motion" r={2.5} fill={cc} opacity={0.85}>
          <animateMotion dur={conn.semantic === 'event' ? '2.5s' : '2s'} repeatCount="indefinite" path={path} />
        </circle>
      )}
    </g>
  );
};

// Horizontal label chip drawn on top of everything so pipes never cut through the
// text; the chip background doubles as padding between the text and the pipe.
const ConnectorLabelChip = ({ conn, dimmed }: { conn: IsoConnector; dimmed: boolean }) => {
  if (!conn.label) return null;

  const point = t2s(conn.route.labelTile.x, conn.route.labelTile.y);
  const fontSize = 9;
  const chipWidth = conn.label.length * fontSize * 0.66 + 12;
  const chipHeight = fontSize + 8;

  return (
    <g
      data-iso-kind="connector-label"
      data-iso-id={conn.id}
      opacity={dimmed ? 0.12 : 1}
      className="stp-diagram__fade stp-diagram__chip"
    >
      <rect
        x={point.x - chipWidth / 2}
        y={point.y - chipHeight / 2}
        width={chipWidth}
        height={chipHeight}
        rx={chipHeight / 2}
        fill="rgba(9, 11, 17, 0.82)"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={0.75}
      />
      <text
        x={point.x}
        y={point.y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={TEXT_SUBTLE}
        fontSize={fontSize}
        fontFamily={FONT}
        fontWeight={500}
      >
        {conn.label}
      </text>
    </g>
  );
};

// ── Main renderer ──

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

type ViewTransform = { panX: number; panY: number; zoom: number };

const DEFAULT_VIEW: ViewTransform = { panX: 0, panY: 0, zoom: 1 };

type TooltipContent = {
  title: string;
  subtitle?: string | undefined;
  summary?: string | undefined;
  details?: string | undefined;
  note?: string | undefined;
};

type TooltipState = TooltipContent & { x: number; y: number };

/**
 * Presentation and interaction options every view of a diagram accepts, whether the caller hands in a
 * scene or a configuration. `ConfigDiagram` extends this so the two stay one declaration.
 */
export type DiagramViewProps = {
  /** Set to false to freeze the flowing dots along connectors, e.g. for a screenshot. */
  animateConnectors?: boolean | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
};

export type IsoRendererProps = DiagramViewProps & {
  scene: IsoScene;
  width?: CSSProperties['width'] | undefined;
  height?: CSSProperties['height'] | undefined;
};

export function IsoRenderer({
  scene,
  width = '100%',
  height = '100%',
  animateConnectors = true,
  ariaLabel = 'Architecture diagram',
  className,
  style
}: IsoRendererProps) {
  const idPrefix = useId().replaceAll(':', '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewTransform>(DEFAULT_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [hoveredConnectorId, setHoveredConnectorId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const moveTooltip = useCallback((e: ReactPointerEvent, content: TooltipContent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 14, ...content });
  }, []);

  const { minX, minY, svgW, svgH } = useMemo(() => {
    const nodeBounds = scene.nodes.map((node) => getNodeScreenBounds(node));
    const rectangleBounds = scene.rectangles.map((rectangle) => {
      const corners = [
        t2s(rectangle.from.x, rectangle.from.y),
        t2s(rectangle.to.x, rectangle.from.y),
        t2s(rectangle.to.x, rectangle.to.y),
        t2s(rectangle.from.x, rectangle.to.y)
      ];

      return {
        minX: Math.min(...corners.map((corner) => corner.x)),
        maxX: Math.max(...corners.map((corner) => corner.x)),
        minY: Math.min(...corners.map((corner) => corner.y)),
        maxY: Math.max(...corners.map((corner) => corner.y))
      } satisfies ScreenBounds;
    });
    const labelBounds = scene.labels.map((label) => {
      const origin = t2s(label.tile.x, label.tile.y);
      const fontSize = label.fontSize || 10;
      const estimatedWidth = label.text.length * fontSize * 0.75;

      return {
        minX: origin.x,
        maxX: origin.x + estimatedWidth,
        minY: origin.y - fontSize,
        maxY: origin.y + fontSize
      } satisfies ScreenBounds;
    });
    const connectorBounds = scene.connectors.flatMap((connector) => {
      const points = tilePointsToScreen({ points: connector.route.points });
      return [
        {
          minX: Math.min(...points.map((point) => point.x)),
          maxX: Math.max(...points.map((point) => point.x)),
          minY: Math.min(...points.map((point) => point.y)),
          maxY: Math.max(...points.map((point) => point.y))
        } satisfies ScreenBounds
      ];
    });
    const connectorLabelBounds = scene.connectors.flatMap((connector) => {
      if (!connector.label) return [];
      const origin = t2s(connector.route.labelTile.x, connector.route.labelTile.y);
      const fontSize = 9;
      const estimatedWidth = connector.label.length * fontSize * 0.7;

      return [
        {
          minX: origin.x - estimatedWidth / 2,
          maxX: origin.x + estimatedWidth / 2,
          minY: origin.y - fontSize,
          maxY: origin.y + fontSize
        } satisfies ScreenBounds
      ];
    });
    const merged = expandBounds({
      bounds: mergeBounds({
        bounds: [...nodeBounds, ...rectangleBounds, ...labelBounds, ...connectorBounds, ...connectorLabelBounds]
      }),
      padding: 80
    });

    return {
      minX: merged.minX,
      minY: merged.minY,
      svgW: merged.maxX - merged.minX,
      svgH: merged.maxY - merged.minY
    };
  }, [scene]);

  const nodeMap = useMemo(() => new Map(scene.nodes.map((n) => [n.id, n])), [scene.nodes]);

  // Neighbor lookup for hover highlighting.
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const connector of scene.connectors) {
      if (!map.has(connector.from)) map.set(connector.from, new Set());
      if (!map.has(connector.to)) map.set(connector.to, new Set());
      map.get(connector.from)?.add(connector.to);
      map.get(connector.to)?.add(connector.from);
    }
    return map;
  }, [scene.connectors]);

  // Reset the view only when the node composition changes (resource added/removed/renamed),
  // not on every re-layout while the user edits resource properties.
  const nodesKey = useMemo(
    () =>
      scene.nodes
        .map((n) => n.id)
        .sort()
        .join('\n'),
    [scene.nodes]
  );
  useEffect(() => {
    setView(DEFAULT_VIEW);
  }, [nodesKey]);

  // Hover details are snapshots of the current scene. Clear them when the host supplies a newly
  // compiled scene so removed resources cannot leave the remainder permanently dimmed or display
  // stale explanatory text.
  useEffect(() => {
    setHoveredNodeId(null);
    setHoveredZoneId(null);
    setHoveredConnectorId(null);
    setTooltip(null);
  }, [scene]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      containerRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY };
    },
    [view.panX, view.panY]
  );
  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (dx !== 0 || dy !== 0) {
        setTooltip(null);
      }
      setView((current) => ({
        ...current,
        panX: dragStart.current.panX + dx,
        panY: dragStart.current.panY + dy
      }));
    },
    [isDragging]
  );
  const onPointerUp = useCallback(() => setIsDragging(false), []);

  // Wheel zoom must preventDefault so the surrounding page doesn't scroll. React attaches
  // wheel listeners passively, so register a non-passive listener manually.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const zoomFactor = e.deltaY > 0 ? 0.93 : 1.07;

      setView((current) => {
        const zoom = clampZoom(current.zoom * zoomFactor);
        const scaleRatio = zoom / current.zoom;
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        return {
          zoom,
          panX: cursorX - (cursorX - current.panX) * scaleRatio,
          panY: cursorY - (cursorY - current.panY) * scaleRatio
        };
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setView((current) => {
      const zoom = clampZoom(current.zoom * factor);
      const scaleRatio = zoom / current.zoom;
      return { zoom, panX: current.panX * scaleRatio, panY: current.panY * scaleRatio };
    });
  }, []);
  const resetView = useCallback(() => setView(DEFAULT_VIEW), []);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const panStep = 40;
      const panByKey: Record<string, { dx: number; dy: number }> = {
        ArrowLeft: { dx: panStep, dy: 0 },
        ArrowRight: { dx: -panStep, dy: 0 },
        ArrowUp: { dx: 0, dy: panStep },
        ArrowDown: { dx: 0, dy: -panStep }
      };

      if (panByKey[e.key]) {
        e.preventDefault();
        const { dx, dy } = panByKey[e.key];
        setView((current) => ({ ...current, panX: current.panX + dx, panY: current.panY + dy }));
      } else if (e.key === '+' || e.key === '=') {
        zoomBy(1.2);
      } else if (e.key === '-') {
        zoomBy(1 / 1.2);
      } else if (e.key === '0') {
        resetView();
      }
    },
    [zoomBy, resetView]
  );

  // Painter's algorithm: with flipped Y, higher (x+y) = further from viewer → render first.
  // Lower (x+y) = closer to viewer → render last (on top).
  const sorted = useMemo(
    () =>
      [...scene.nodes].sort((a, b) => {
        const aDepth = a.tile.x + a.tile.y;
        const bDepth = b.tile.x + b.tile.y;
        return bDepth - aDepth;
      }),
    [scene.nodes]
  );

  const gridRange = useMemo<TileRange>(() => {
    const xs = [...scene.nodes.map((n) => n.tile.x), ...scene.rectangles.flatMap((r) => [r.from.x, r.to.x])];
    const ys = [...scene.nodes.map((n) => n.tile.y), ...scene.rectangles.flatMap((r) => [r.from.y, r.to.y])];
    const pad = 8;

    return {
      minX: Math.floor(Math.min(0, ...xs)) - pad,
      maxX: Math.ceil(Math.max(0, ...xs)) + pad,
      minY: Math.floor(Math.min(0, ...ys)) - pad,
      maxY: Math.ceil(Math.max(0, ...ys)) + pad
    };
  }, [scene]);

  const hoveredNeighbors = hoveredNodeId ? adjacency.get(hoveredNodeId) : null;
  const hoveredConnector = hoveredConnectorId
    ? scene.connectors.find((connector) => connector.id === hoveredConnectorId)
    : null;

  // Hovering a boundary focuses its members plus everything directly connected to them.
  const hoveredZoneFocus = useMemo(() => {
    if (!hoveredZoneId) return null;
    const rect = scene.rectangles.find((r) => r.id === hoveredZoneId);
    if (!rect?.memberNodeIds) return null;
    const members = new Set(rect.memberNodeIds);
    const related = new Set(members);
    for (const member of members) {
      for (const neighbor of adjacency.get(member) || []) related.add(neighbor);
    }
    return { members, related };
  }, [hoveredZoneId, scene.rectangles, adjacency]);

  const isNodeDimmed = (nodeId: string) => {
    if (hoveredConnector) return nodeId !== hoveredConnector.from && nodeId !== hoveredConnector.to;
    if (hoveredNodeId) return nodeId !== hoveredNodeId && !hoveredNeighbors?.has(nodeId);
    if (hoveredZoneFocus) return !hoveredZoneFocus.related.has(nodeId);
    return false;
  };
  const isConnectorDimmed = (connector: IsoConnector) => {
    if (hoveredConnectorId) return connector.id !== hoveredConnectorId;
    if (hoveredNodeId) return connector.from !== hoveredNodeId && connector.to !== hoveredNodeId;
    if (hoveredZoneFocus) {
      return !hoveredZoneFocus.members.has(connector.from) && !hoveredZoneFocus.members.has(connector.to);
    }
    return false;
  };

  return (
    <section
      ref={containerRef}
      aria-label={ariaLabel}
      // The labelled section is focusable because arrow keys pan it and +, -, 0 control zoom.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className={className ? `stp-diagram ${className}` : 'stp-diagram'}
      style={{ width, height, ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        role="img"
        aria-label={ariaLabel}
        className="stp-diagram__canvas"
        style={{ transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})` }}
      >
        <defs>
          <filter id={`${idPrefix}-iso-shadow-blur`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <marker
            id={`${idPrefix}-iso-arrow-request`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill={BRAND} fillOpacity={0.6} />
          </marker>
          <marker
            id={`${idPrefix}-iso-arrow-event`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#FF9900" fillOpacity={0.6} />
          </marker>
          <marker
            id={`${idPrefix}-iso-arrow-dependency`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill={BRAND} fillOpacity={0.35} />
          </marker>
          <marker
            id={`${idPrefix}-iso-arrow-egress`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#A166FF" fillOpacity={0.3} />
          </marker>
        </defs>
        <IsoGrid range={gridRange} />
        {scene.rectangles.map((r) => (
          <FloorPlane
            key={r.id}
            rect={r}
            isHovered={hoveredZoneId === r.id}
            onPointerEnter={() => {
              if (!isDragging) setHoveredZoneId(r.id);
            }}
            onPointerLeave={() => {
              setHoveredZoneId((current) => (current === r.id ? null : current));
              setTooltip(null);
            }}
            onPointerMove={(e) => {
              if (isDragging || !r.label) return;
              moveTooltip(e, {
                title: r.label,
                subtitle: r.id === 'zone-edge' ? 'Global edge network' : 'Network boundary',
                summary: r.summary,
                details: r.details
              });
            }}
          />
        ))}
        {scene.connectors.map((c) => (
          <ConnSvg
            key={c.id}
            conn={c}
            idPrefix={idPrefix}
            nodeMap={nodeMap}
            animateConnectors={animateConnectors}
            dimmed={isConnectorDimmed(c)}
            highlighted={hoveredConnectorId === c.id}
            onPointerEnter={() => {
              if (!isDragging) setHoveredConnectorId(c.id);
            }}
            onPointerLeave={() => {
              setHoveredConnectorId((current) => (current === c.id ? null : current));
              setTooltip(null);
            }}
            onPointerMove={(e) => {
              if (isDragging || !c.description) return;
              moveTooltip(e, {
                title: `${c.from} → ${c.to}`,
                subtitle: EDGE_SEMANTIC_LABELS[c.semantic || 'request'],
                details: c.description
              });
            }}
          />
        ))}
        {sorted.map((n) => (
          <g
            key={n.id}
            data-iso-kind="node"
            data-iso-id={n.id}
            opacity={isNodeDimmed(n.id) ? 0.35 : 1}
            className="stp-diagram__fade"
            onPointerEnter={() => {
              if (!isDragging) setHoveredNodeId(n.id);
            }}
            onPointerLeave={() => {
              setHoveredNodeId((current) => (current === n.id ? null : current));
              setTooltip(null);
            }}
            onPointerMove={(e) => {
              if (isDragging) return;
              e.stopPropagation();
              moveTooltip(e, {
                title: n.label,
                subtitle: [n.typeName || n.resourceType, n.isImplicit ? 'created automatically' : null]
                  .filter(Boolean)
                  .join(' · '),
                summary: n.summary,
                details: n.details,
                note: n.accessNote
              });
            }}
          >
            <IsoNodeBlock idPrefix={idPrefix} node={n} />
          </g>
        ))}
        {scene.connectors.map((c) => (
          <ConnectorLabelChip key={`${c.id}-label`} conn={c} dimmed={isConnectorDimmed(c)} />
        ))}
        {scene.labels.map((l) => (
          <ZoneTag key={l.id} label={l} />
        ))}
      </svg>
      {tooltip && (
        <div className="stp-diagram__tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="stp-diagram__tooltip-heading">
            <p className="stp-diagram__tooltip-title">{tooltip.title}</p>
            {tooltip.subtitle && <p className="stp-diagram__tooltip-subtitle">{tooltip.subtitle}</p>}
          </div>
          {tooltip.summary && <p className="stp-diagram__tooltip-summary">{tooltip.summary}</p>}
          {tooltip.details && <p className="stp-diagram__tooltip-details">{tooltip.details}</p>}
          {tooltip.note && <p className="stp-diagram__tooltip-note">{tooltip.note}</p>}
        </div>
      )}
      {!tooltip && <p className="stp-diagram__hint">Hover a resource, pipe, or boundary to learn what it does</p>}
      <div className="stp-diagram__controls" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          className="stp-diagram__control"
          onClick={() => zoomBy(1.25)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          className="stp-diagram__control"
          onClick={() => zoomBy(1 / 1.25)}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset view"
          title="Reset view"
          className="stp-diagram__control"
          onClick={resetView}
        >
          ⌂
        </button>
      </div>
    </section>
  );
}
