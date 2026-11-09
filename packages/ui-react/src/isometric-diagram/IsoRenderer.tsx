/**
 * Isometric diagram renderer.
 *
 * Each node is drawn as its own isometric shape (see `node-shapes.tsx`): cylinders for databases, an open bucket
 * for S3, a gate for an API, a plate of task cubes for a container service, and so on, painted in the AWS category
 * colour. Names, type lines, badges, zone tags, connector chips and tooltips are flat screen-space text drawn above
 * the geometry — only the geometry itself is isometric.
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
  IsoTilePoint
} from './scene.js';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BiExpand, BiMinus, BiPlus } from 'react-icons/bi';
import {
  BADGE_HEIGHT_PX,
  BADGE_OFFSET_PX,
  NAME_MAX_CHARS,
  SHAPE_HEIGHT_PX,
  TYPE_MAX_CHARS
} from './node-appearance.js';
import { NodeBadges, NodeShape } from './node-shapes.js';
import { pts, t2s, TH, TW } from './projection.js';
import { EDGE_SEMANTIC_LABELS } from './resource-explanations.js';

// Chrome colours come from `@stacktape/design-tokens`; the host loads the token CSS together with
// `@stacktape/ui-react/isometric-diagram.css`. They are referenced as variables rather than
// imported values so a host can retheme the diagram without rebuilding this package. Scene colours
// (node bodies, connector semantics keyed to AWS categories) stay literal — the shading maths has
// to read their channels.
const TEXT_SUBTLE = 'var(--stp-text-subtle)';
const BRAND = 'var(--stp-color-brand)';
const SECURITY = '#E2484E';

// ── Iso helpers ──

/** Half the footprint of a node's floor tile, in tiles. Shapes stay inside it; connectors stop at its edge. */
const HW = 0.66;

const frontTip = (cx: number, cy: number) => t2s(cx - HW, cy - HW);

const MAX_SHAPE_HEIGHT = Math.max(...Object.values(SHAPE_HEIGHT_PX));

type ScreenBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const getNodeScreenBounds = (node: IsoNode): ScreenBounds => {
  const origin = t2s(node.tile.x, node.tile.y);
  const halfWidth = HW * TW + 8;

  return {
    minX: origin.x - halfWidth,
    maxX: origin.x + halfWidth,
    // Leaves room for a badge above the tallest shape.
    minY: origin.y - MAX_SHAPE_HEIGHT - BADGE_OFFSET_PX - BADGE_HEIGHT_PX,
    // Includes the two-line name tag hanging below the front tip.
    maxY: origin.y + HW * TH + 40
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

const FONT = "'Montserrat', 'Inter', sans-serif";

const truncate = (text: string, maxChars: number) =>
  text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

// ── Node name tag ──
// Flat, horizontal, hanging below the shape's front tip: the resource name, then a muted line saying what it is.
const NodeNameTag = ({ node }: { node: IsoNode }) => {
  const tip = frontTip(node.tile.x, node.tile.y);

  return (
    <text
      x={tip.x}
      y={tip.y + 14}
      textAnchor="middle"
      stroke="rgba(9, 11, 17, 0.85)"
      strokeWidth={3}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      fontFamily={FONT}
    >
      <tspan x={tip.x} fill="rgba(255,255,255,0.92)" fontSize={12} fontWeight={600}>
        {truncate(node.label, NAME_MAX_CHARS)}
      </tspan>
      {node.typeLabel && (
        <tspan x={tip.x} dy={14} fill="#8E9AAB" fontSize={10} fontWeight={500} data-iso-kind="type-label">
          {truncate(node.typeLabel, TYPE_MAX_CHARS)}
        </tspan>
      )}
    </text>
  );
};

// ── Node ──

const IsoNodeBlock = ({ idPrefix, node }: { idPrefix: string; node: IsoNode }) => (
  <g>
    <NodeShape node={node} idBase={`${idPrefix}-n-${node.id}`} shadowFilterId={`${idPrefix}-iso-shadow-blur`} />
    <NodeBadges node={node} />
    <NodeNameTag node={node} />
  </g>
);

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
// The zone's name, set by the layout along one of the zone's edges (inside it when there is room) and rotated to that
// edge. Drawn above all scene geometry, so it is never occluded.
const EDGE_ANGLE_DEGREES = (Math.atan2(TH / 2, TW / 2) * 180) / Math.PI;

function ZoneTag({ label }: { label: IsoLabel }) {
  const { x, y } = t2s(label.tile.x, label.tile.y);
  const degrees = label.axis === 'y' ? EDGE_ANGLE_DEGREES : -EDGE_ANGLE_DEGREES;

  return (
    <text
      data-iso-kind="floor-label"
      data-iso-id={label.id}
      x={x}
      y={y}
      transform={`rotate(${degrees.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
      textAnchor="start"
      dominantBaseline="central"
      fill={label.color || TEXT_SUBTLE}
      stroke="rgba(9, 11, 17, 0.8)"
      strokeWidth={2.5}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      fontSize={label.fontSize || 11}
      fontFamily={FONT}
      fontWeight={700}
      letterSpacing={0.4}
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
    case 'security':
      return { strokeWidth: 1.6, strokeOpacity: 0.55, dashArray: '2 4', color: SECURITY };
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
      case 'security':
        return 'security';
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
  const fontSize = 10;
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

/** Pointer position in viewport coordinates: the tooltip is rendered outside the diagram's box. */
type TooltipState = TooltipContent & { x: number; y: number };

/** Clear of the pointer, and clear of the window's edges. */
const TOOLTIP_OFFSET = 16;
const TOOLTIP_MARGIN = 12;

/**
 * Presentation and interaction options every view of a diagram accepts, whether the caller hands in a
 * scene or a configuration. `IsometricDiagram` extends this so the two stay one declaration.
 */
export type DiagramViewProps = {
  /** Set to false to freeze the flowing dots along connectors, e.g. for a screenshot. */
  animateConnectors?: boolean | undefined;
  ariaLabel?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /**
   * The zoom the view opens at, and returns to when it is reset. 1 fits the whole scene inside the
   * frame with a margin around it; raise it to fill a short frame, where that margin is most of
   * what the reader sees. Clamped to the same range as the zoom controls.
   */
  initialZoom?: number | undefined;
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
  style,
  initialZoom
}: IsoRendererProps) {
  const idPrefix = useId().replaceAll(':', '');
  const containerRef = useRef<HTMLDivElement>(null);
  /** Where the view starts, and where resetting takes it back to. */
  const home = useMemo<ViewTransform>(
    () => (initialZoom === undefined ? DEFAULT_VIEW : { ...DEFAULT_VIEW, zoom: clampZoom(initialZoom) }),
    [initialZoom]
  );
  const [view, setView] = useState<ViewTransform>(home);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [hoveredConnectorId, setHoveredConnectorId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const moveTooltip = useCallback((e: ReactPointerEvent, content: TooltipContent) => {
    setTooltip({ x: e.clientX, y: e.clientY, ...content });
  }, []);

  /*
   * The tooltip is a child of the document, not of the diagram: the diagram clips its own overflow
   * so the view can be panned, and inside a small frame a tooltip near an edge would be cut off.
   * Being outside means it is placed in viewport coordinates, and that its own measured size keeps
   * it on screen — it flips above the pointer near the bottom and slides along the right edge.
   */
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node || !tooltip) return;
    const box = node.getBoundingClientRect();
    const maxLeft = window.innerWidth - box.width - TOOLTIP_MARGIN;
    const below = tooltip.y + TOOLTIP_OFFSET;
    const fitsBelow = below + box.height + TOOLTIP_MARGIN <= window.innerHeight;
    node.style.left = `${Math.max(TOOLTIP_MARGIN, Math.min(tooltip.x + TOOLTIP_OFFSET, maxLeft))}px`;
    node.style.top = `${Math.max(TOOLTIP_MARGIN, fitsBelow ? below : tooltip.y - TOOLTIP_OFFSET - box.height)}px`;
  }, [tooltip]);

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
    // Zone tags lie inside their zone, whose rectangle is already in the bounds.
    const labelBounds: ScreenBounds[] = [];
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
      const fontSize = 10;
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
    setView(home);
  }, [nodesKey, home]);

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
  const resetView = useCallback(() => setView(home), [home]);

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
      // The tooltip lives outside this element now, so leaving the diagram has to dismiss it here
      // as well: a shape's own leave event can be missed when the pointer exits quickly.
      onPointerLeave={() => setTooltip(null)}
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
          <marker
            id={`${idPrefix}-iso-arrow-security`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill={SECURITY} fillOpacity={0.7} />
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
                subtitle: [n.typeName || n.typeLabel || n.resourceType, n.isImplicit ? 'created automatically' : null]
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
      {tooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="stp-diagram__tooltip"
            ref={tooltipRef}
            style={{ left: tooltip.x + TOOLTIP_OFFSET, top: tooltip.y + TOOLTIP_OFFSET }}
          >
            <div className="stp-diagram__tooltip-heading">
              <p className="stp-diagram__tooltip-title">{tooltip.title}</p>
              {tooltip.subtitle && <p className="stp-diagram__tooltip-subtitle">{tooltip.subtitle}</p>}
            </div>
            {tooltip.summary && <p className="stp-diagram__tooltip-summary">{tooltip.summary}</p>}
            {tooltip.details && <p className="stp-diagram__tooltip-details">{tooltip.details}</p>}
            {tooltip.note && <p className="stp-diagram__tooltip-note">{tooltip.note}</p>}
          </div>,
          document.body
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
          <BiPlus aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          className="stp-diagram__control"
          onClick={() => zoomBy(1 / 1.25)}
        >
          <BiMinus aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          aria-label="Reset view"
          title="Reset view"
          className="stp-diagram__control"
          onClick={resetView}
        >
          <BiExpand aria-hidden="true" size={16} />
        </button>
      </div>
    </section>
  );
}
