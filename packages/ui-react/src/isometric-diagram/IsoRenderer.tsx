/**
 * Isometric diagram renderer.
 *
 * Each node is drawn as its own isometric shape (see `node-shapes.tsx`): cylinders for databases, an open bucket
 * for S3, a gate for an API, a plate of task cubes for a container service, and so on, painted in the AWS category
 * colour. Names, type lines, badges, zone tags, connector chips and tooltips are flat screen-space text drawn above
 * the geometry — only the geometry itself is isometric.
 * Layout flows bottom-left (external) to top-right (data).
 */
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from 'react';
import type {
  IsoConnector,
  IsoConnectorRoute,
  IsoGroup,
  IsoLabel,
  IsoNode,
  IsoRectangle,
  IsoScene,
  IsoSecurityGroup,
  IsoSecurityRule,
  IsoTilePoint
} from './scene.js';
import type { DiagramStatuses, DiagramStatusTone, NodeStatus } from './status.js';
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BiExpand, BiInfoCircle, BiMinus, BiPlus, BiSearch } from 'react-icons/bi';
import { DiagramPanel } from './DiagramPanel.js';
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
import { NodeStatusPill, NodeStatusRing, ToneIconInline } from './status-marks.js';
import {
  buildNodeStatuses,
  countResourcesNeedingAttention,
  getGroupStatus,
  getResourceStatus,
  needsAttention,
  readStatuses,
  worseTone
} from './status.js';

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

const pointBounds = (point: IsoTilePoint): ScreenBounds => {
  const screen = t2s(point.x, point.y);
  return { minX: screen.x, maxX: screen.x, minY: screen.y, maxY: screen.y };
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

/** A ring on the floor around a node that is selected, focused or matches the search. */
const NodeRing = ({ node, strong }: { node: IsoNode; strong: boolean }) => {
  const reach = HW + 0.16;
  const { x, y } = node.tile;
  return (
    <polygon
      data-iso-kind="node-ring"
      points={pts(
        t2s(x - reach, y - reach),
        t2s(x + reach, y - reach),
        t2s(x + reach, y + reach),
        t2s(x - reach, y + reach)
      )}
      fill={BRAND}
      fillOpacity={strong ? 0.16 : 0.08}
      stroke={BRAND}
      strokeOpacity={strong ? 0.95 : 0.6}
      strokeWidth={strong ? 2 : 1.4}
      strokeDasharray={strong ? undefined : '5 4'}
    />
  );
};

const IsoNodeBlock = ({
  idPrefix,
  node,
  ring,
  status
}: {
  idPrefix: string;
  node: IsoNode;
  ring: 'strong' | 'soft' | null;
  status: NodeStatus | undefined;
}) => (
  <g>
    {status && <NodeStatusRing node={node} tone={status.tone} halfWidth={HW} />}
    {ring && <NodeRing node={node} strong={ring === 'strong'} />}
    <NodeShape node={node} idBase={`${idPrefix}-n-${node.id}`} shadowFilterId={`${idPrefix}-iso-shadow-blur`} />
    <NodeBadges node={node} />
    <NodeNameTag node={node} />
    {status && <NodeStatusPill node={node} status={status} tip={frontTip(node.tile.x, node.tile.y)} />}
  </g>
);

/**
 * The control on a collapsed group that draws its members one by one: a round "+" just off the deck's left corner, so
 * it covers neither the glyph nor the count badge on the right.
 */
const GroupToggle = ({ node, onToggle }: { node: IsoNode; onToggle: () => void }) => {
  const center = t2s(node.tile.x, node.tile.y);
  const x = center.x - 46;
  const y = center.y - SHAPE_HEIGHT_PX[node.shape] - 4;
  return (
    <g
      data-iso-kind="group-toggle"
      data-iso-id={node.id}
      role="button"
      tabIndex={0}
      aria-label={`Show the ${node.typeLabel ?? 'members'} in ${node.label} one by one`}
      className="stp-diagram__group-toggle"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <title>Expand group</title>
      <circle cx={x} cy={y} r={9.5} fill="#0B0D12" stroke="rgba(255,255,255,0.45)" strokeWidth={1.2} />
      <path
        d={`M ${x - 4.5} ${y} H ${x + 4.5} M ${x} ${y - 4.5} V ${y + 4.5}`}
        stroke="#F1F4F8"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
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
  const baseStyle = getSemanticStyle(conn.semantic);
  // A connector that stands for several gets a little heavier, never more than double.
  const style = conn.count
    ? { ...baseStyle, strokeWidth: baseStyle.strokeWidth * Math.min(2, 1 + Math.log2(conn.count) * 0.2) }
    : baseStyle;
  const cc = conn.color || style.color;

  return (
    <g className="stp-diagram__fade" opacity={dimmed ? 0.12 : conn.muted && !highlighted ? 0.35 : 1}>
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
      {animateConnectors && conn.semantic !== 'egress' && !conn.muted && (
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
      opacity={dimmed ? 0.12 : conn.muted ? 0.45 : 1}
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

// ── Security groups and rules ──

/** A security group's outline: a chamfered floor rectangle in the group's colour, dashed for a group defined elsewhere. */
const OUTLINE_CHAMFER = 0.22;

const SecurityOutline = ({
  group,
  outline,
  dimmed,
  highlighted,
  onPointerEnter,
  onPointerLeave,
  onPointerMove
}: {
  group: IsoSecurityGroup;
  outline: IsoSecurityGroup['outlines'][number];
  dimmed: boolean;
  highlighted: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: (e: ReactPointerEvent) => void;
}) => {
  const { from, to } = outline;
  const c = Math.min(OUTLINE_CHAMFER, (to.x - from.x) / 4, (to.y - from.y) / 4);
  const corners = [
    t2s(from.x + c, from.y),
    t2s(to.x - c, from.y),
    t2s(to.x, from.y + c),
    t2s(to.x, to.y - c),
    t2s(to.x - c, to.y),
    t2s(from.x + c, to.y),
    t2s(from.x, to.y - c),
    t2s(from.x, from.y + c)
  ];
  return (
    <polygon
      data-iso-kind="security-group"
      data-iso-id={group.id}
      points={pts(...corners)}
      fill={group.color}
      fillOpacity={highlighted ? 0.1 : 0.045}
      stroke={group.color}
      strokeOpacity={dimmed ? 0.25 : highlighted ? 1 : 0.85}
      strokeWidth={highlighted ? 2.4 : 1.7}
      strokeDasharray={group.external ? '6 4' : undefined}
      strokeLinejoin="round"
      className="stp-diagram__fade"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    />
  );
};

/** The group's name on a tab beside its outline, flat in screen space like every other label. */
const SecurityTab = ({
  group,
  tile,
  dimmed,
  onPointerEnter,
  onPointerLeave,
  onPointerMove
}: {
  group: IsoSecurityGroup;
  tile: IsoTilePoint;
  dimmed: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: (e: ReactPointerEvent) => void;
}) => {
  const { x, y } = t2s(tile.x, tile.y);
  const text = truncate(group.name, 32);
  const width = text.length * 6.2 + 14;
  return (
    <g
      data-iso-kind="security-group-tab"
      data-iso-id={group.id}
      opacity={dimmed ? 0.25 : 1}
      className="stp-diagram__fade"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      <rect
        x={x - width / 2}
        y={y - 8}
        width={width}
        height={16}
        rx={4}
        fill="rgba(9, 11, 17, 0.9)"
        stroke={group.color}
        strokeWidth={1.2}
        strokeDasharray={group.external ? '3 2' : undefined}
      />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={group.color}
        fontSize={10}
        fontFamily={FONT}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
};

/** An arrowhead drawn at the end of a screen-space path, so each rule keeps its own colour without a marker per colour. */
const arrowHead = (points: { x: number; y: number }[]) => {
  const tip = points[points.length - 1];
  const previous = points[points.length - 2];
  const dx = tip.x - previous.x;
  const dy = tip.y - previous.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const back = { x: tip.x - ux * 10, y: tip.y - uy * 10 };
  return pts(
    tip,
    { x: back.x - uy * 5, y: back.y + ux * 5 },
    { x: tip.x - ux * 7, y: tip.y - uy * 7 },
    { x: back.x + uy * 5, y: back.y - ux * 5 }
  );
};

const SecurityRuleArrow = ({
  rule,
  dimmed,
  highlighted,
  onPointerEnter,
  onPointerLeave,
  onPointerMove
}: {
  rule: IsoSecurityRule;
  dimmed: boolean;
  highlighted: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: (e: ReactPointerEvent) => void;
}) => {
  const points = trimRouteAtTarget({ points: rule.route.points });
  const path = buildPath({ route: { ...rule.route, points } });
  const screen = tilePointsToScreen({ points });
  if (screen.length < 2) return null;
  return (
    <g
      data-iso-kind="security-rule"
      data-iso-id={rule.id}
      data-iso-source={rule.source}
      opacity={dimmed ? 0.15 : 1}
      className="stp-diagram__fade"
    >
      <path
        d={path}
        fill="none"
        stroke={rule.color}
        strokeWidth={highlighted ? 3.2 : 2.4}
        strokeOpacity={highlighted ? 1 : 0.85}
        strokeLinecap="round"
      />
      <polygon points={arrowHead(screen)} fill={rule.color} />
      {!rule.from && <circle cx={screen[0].x} cy={screen[0].y} r={2.6} fill={rule.color} />}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      />
    </g>
  );
};

const SecurityRuleChip = ({ rule, dimmed }: { rule: IsoSecurityRule; dimmed: boolean }) => {
  if (!rule.label) return null;
  const point = t2s(rule.route.labelTile.x, rule.route.labelTile.y);
  const fontSize = 10;
  const chipWidth = rule.label.length * fontSize * 0.62 + 12;
  const chipHeight = fontSize + 8;
  return (
    <g
      data-iso-kind="security-rule-label"
      data-iso-id={rule.id}
      opacity={dimmed ? 0.15 : 1}
      className="stp-diagram__fade stp-diagram__chip"
    >
      <rect
        x={point.x - chipWidth / 2}
        y={point.y - chipHeight / 2}
        width={chipWidth}
        height={chipHeight}
        rx={chipHeight / 2}
        fill="rgba(9, 11, 17, 0.9)"
        stroke={rule.color}
        strokeOpacity={0.7}
        strokeWidth={1}
      />
      <text
        x={point.x}
        y={point.y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={rule.source === 'group' ? '#E6EAF0' : rule.color}
        fontSize={fontSize}
        fontFamily={FONT}
        fontWeight={600}
      >
        {rule.label}
      </text>
    </g>
  );
};

const SECURITY_RULE_SUBTITLES: Record<IsoSecurityRule['source'], string> = {
  group: 'Allowed by a security group rule',
  internet: 'Open to the internet',
  address: 'Allowed from an address range'
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
  /** What the host reports about the resource, worst first. */
  status?: Array<{ tone: DiagramStatusTone; text: string; detail?: string | undefined }> | undefined;
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
  /**
   * Opens a resource the configuration declares, by its name. When set, the side panel offers it as an action for
   * declared resources (not for ones Stacktape creates implicitly, nor for groups). Console opens its resource dialog.
   */
  onOpenResource?: ((resourceName: string) => void) | undefined;
  /** Whether `onOpenResource` can open this resource; without it, every declared resource can be opened. */
  canOpenResource?: ((resourceName: string) => boolean) | undefined;
  /**
   * What a deployed stage reports about its resources, by declared resource name: a pill under the name, a ring in the
   * worst tone, a group's summary and every status with its link in the side panel. Passing it at all, even empty,
   * reserves room for the pill under every declared resource, so pass it from the first render while statuses load.
   * Statuses never move a node.
   */
  statuses?: DiagramStatuses | undefined;
  /**
   * Follows a status link inside the host, e.g. with its router, instead of a full page load. Clicks with a modifier key
   * still open the link the browser's way.
   */
  onNavigate?: ((href: string) => void) | undefined;
  /**
   * Short host messages about the whole picture rather than one resource, such as a deploy that will replace what is
   * drawn or an incident no resource is tied to. They sit under the toolbar inside the frame, so one appearing or
   * going away never resizes the drawing.
   */
  notices?: readonly DiagramNotice[] | undefined;
};

export type DiagramNotice = { id: string; tone: 'critical' | 'warning' | 'info'; content: ReactNode };

export type IsoRendererProps = DiagramViewProps & {
  scene: IsoScene;
  width?: CSSProperties['width'] | undefined;
  height?: CSSProperties['height'] | undefined;
  /** Expands or collapses a role group. Without it, groups have no expand control. */
  onToggleGroup?: ((groupId: string) => void) | undefined;
  /** Controls placed first in the toolbar, such as the view switcher. */
  toolbar?: ReactNode;
  /** A line about the current view, such as the Security view's legend, shown where the usage hint otherwise is. */
  viewNote?: ReactNode;
};

/** How far the pointer moves before a press becomes a drag instead of a click, in screen pixels. */
const DRAG_THRESHOLD = 4;

const normalize = (text: string) => text.trim().toLowerCase();

/** The nodes a search matches: by name, and a group when one of its members matches. */
const findMatches = ({ scene, query }: { scene: IsoScene; query: string }) => {
  const needle = normalize(query);
  const matches = new Set<string>();
  if (!needle) return matches;
  const groupsById = new Map(scene.groups.map((group) => [group.id, group]));
  for (const node of scene.nodes) {
    const group = node.memberCount ? groupsById.get(node.id) : undefined;
    const names = [node.label, node.id, ...(group?.members.map((member) => member.label) ?? [])];
    if (names.some((name) => name.toLowerCase().includes(needle))) matches.add(node.id);
  }
  return matches;
};

export function IsoRenderer({
  scene,
  width = '100%',
  height = '100%',
  animateConnectors = true,
  ariaLabel = 'Architecture diagram',
  className,
  style,
  initialZoom,
  onOpenResource,
  canOpenResource,
  statuses,
  onNavigate,
  notices,
  onToggleGroup,
  toolbar,
  viewNote
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
  const [hoveredSecurityGroupId, setHoveredSecurityGroupId] = useState<string | null>(null);
  const [hoveredRuleId, setHoveredRuleId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  /** Whether the toolbar's "need attention" chip is on: it dims everything that does not report a problem. */
  const [showAttention, setShowAttention] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  /** The element that had focus when the panel opened; closing the panel returns focus there. */
  const panelOpenerRef = useRef<Element | null>(null);
  /** A press on the canvas: where it started, and whether it has turned into a drag. */
  const press = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
    dragged: boolean;
  } | null>(null);
  /** Set when a press ended as a drag, so the click that follows it does not select anything. */
  const suppressClick = useRef(false);

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
    // A scene with a frame fits the whole picture, whichever view shows part of it, so switching views moves nothing.
    if (scene.frame) {
      const { frame } = scene;
      const merged = expandBounds({
        bounds: mergeBounds({
          bounds: [
            ...frame.nodeTiles.map((tile) => getNodeScreenBounds({ tile } as IsoNode)),
            ...frame.points.map((point) => pointBounds(point)),
            ...frame.chips.map(({ tile, text }) => {
              const half = (text.length * 10 * 0.7) / 2;
              const screen = t2s(tile.x, tile.y);
              return { minX: screen.x - half, maxX: screen.x + half, minY: screen.y - 10, maxY: screen.y + 10 };
            })
          ]
        }),
        padding: 80
      });
      return { minX: merged.minX, minY: merged.minY, svgW: merged.maxX - merged.minX, svgH: merged.maxY - merged.minY };
    }
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
    for (const rule of scene.securityRules ?? []) {
      if (!rule.from) continue;
      if (!map.has(rule.from)) map.set(rule.from, new Set());
      if (!map.has(rule.to)) map.set(rule.to, new Set());
      map.get(rule.from)?.add(rule.to);
      map.get(rule.to)?.add(rule.from);
    }
    return map;
  }, [scene.connectors, scene.securityRules]);

  // Reset the view only when the node composition changes (resource added/removed/renamed),
  // not on every re-layout while the user edits resource properties.
  const nodesKey = useMemo(
    () =>
      scene.frame?.key ??
      scene.nodes
        .map((n) => n.id)
        .sort()
        .join('\n'),
    [scene.frame, scene.nodes]
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
    setHoveredSecurityGroupId(null);
    setHoveredRuleId(null);
    setTooltip(null);
    // A selection survives a new scene while what it names is still there: a node, or a group expanded in place.
    setSelectedId((current) =>
      current && (scene.nodes.some((node) => node.id === current) || scene.groups.some((group) => group.id === current))
        ? current
        : null
    );
  }, [scene]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      suppressClick.current = false;
      press.current = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        panX: view.panX,
        panY: view.panY,
        dragged: false
      };
    },
    [view.panX, view.panY]
  );
  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const current = press.current;
    if (!current || current.pointerId !== e.pointerId) return;
    const dx = e.clientX - current.x;
    const dy = e.clientY - current.y;
    // A press becomes a drag only once it moves, so a click on a node still reaches the node.
    if (!current.dragged) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      current.dragged = true;
      containerRef.current?.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setTooltip(null);
    }
    setView((previous) => ({ ...previous, panX: current.panX + dx, panY: current.panY + dy }));
  }, []);
  const onPointerUp = useCallback(() => {
    suppressClick.current = Boolean(press.current?.dragged);
    press.current = null;
    setIsDragging(false);
  }, []);

  const selectNode = useCallback((nodeId: string) => {
    if (typeof document !== 'undefined') panelOpenerRef.current = document.activeElement;
    setSelectedId(nodeId);
    setTooltip(null);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedId(null);
    const opener = panelOpenerRef.current;
    panelOpenerRef.current = null;
    const container = containerRef.current;
    if (opener instanceof HTMLElement || opener instanceof SVGElement) {
      if (container?.contains(opener)) {
        opener.focus();
        return;
      }
    }
    container?.focus();
  }, []);

  // Move focus into the panel when it opens or shows another node, so a keyboard reader lands on its heading.
  useEffect(() => {
    if (selectedId) panelHeadingRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  // Wheel zoom must preventDefault so the surrounding page doesn't scroll. React attaches
  // wheel listeners passively, so register a non-passive listener manually.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const onWheel = (e: WheelEvent) => {
      // The panel scrolls its own content.
      if (e.target instanceof Element && e.target.closest('.stp-diagram__panel')) return;
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
      // Typing in the search box or reading the panel must not pan or zoom.
      if (e.target instanceof Element && e.target.closest('.stp-diagram__panel, .stp-diagram__toolbar')) return;
      if (e.key === 'Escape') {
        if (selectedId) closePanel();
        else if (query) setQuery('');
        return;
      }
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
    [zoomBy, resetView, selectedId, closePanel, query]
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

  const matches = useMemo(() => findMatches({ scene, query }), [scene, query]);
  const isSearching = normalize(query).length > 0;

  // Statuses are applied to the placed scene; nothing here feeds back into the layout.
  const statusMap = useMemo(() => readStatuses(statuses), [statuses]);
  const nodeStatuses = useMemo(
    () => buildNodeStatuses({ nodes: scene.nodes, groups: scene.groups, statuses: statusMap }),
    [scene, statusMap]
  );
  const attention = useMemo(() => {
    const nodeIds = new Set([...nodeStatuses].filter(([, status]) => needsAttention(status.tone)).map(([id]) => id));
    const tones: DiagramStatusTone[] = [...nodeStatuses.values()].map((status) => status.tone).filter(needsAttention);
    return {
      nodeIds,
      resources: countResourcesNeedingAttention(nodeStatuses),
      tone: tones.length > 0 ? tones.reduce(worseTone) : undefined
    };
  }, [nodeStatuses]);
  const isShowingAttention = showAttention && attention.nodeIds.size > 0 && !isSearching;

  // Keyboard focus on a node focuses the graph the same way hovering it does.
  const focusNodeId = hoveredNodeId ?? focusedNodeId;
  const focusNeighbors = focusNodeId ? adjacency.get(focusNodeId) : null;

  const hoveredRule = hoveredRuleId ? scene.securityRules?.find((rule) => rule.id === hoveredRuleId) : undefined;
  // Hovering a security group focuses its members and whatever its rules connect them with.
  const groupMembers = useMemo(
    () => new Map((scene.securityGroups ?? []).map((group) => [group.id, new Set(group.memberNodeIds)])),
    [scene.securityGroups]
  );
  /** The nodes a rule arrow concerns: everything in the groups at both ends. */
  const ruleNodes = useCallback(
    (rule: IsoSecurityRule) =>
      new Set([
        rule.to,
        ...(rule.from ? [rule.from] : []),
        ...(groupMembers.get(rule.toGroup) ?? []),
        ...(rule.fromGroup ? (groupMembers.get(rule.fromGroup) ?? []) : [])
      ]),
    [groupMembers]
  );
  // Hovering a security group focuses its members and the groups its rules connect it with.
  const hoveredGroupFocus = useMemo(() => {
    if (!hoveredSecurityGroupId) return null;
    const members = groupMembers.get(hoveredSecurityGroupId);
    if (!members) return null;
    const related = new Set(members);
    for (const rule of scene.securityRules ?? []) {
      if (rule.toGroup !== hoveredSecurityGroupId && rule.fromGroup !== hoveredSecurityGroupId) continue;
      for (const nodeId of ruleNodes(rule)) related.add(nodeId);
    }
    return { groupId: hoveredSecurityGroupId, members, related };
  }, [hoveredSecurityGroupId, groupMembers, scene.securityRules, ruleNodes]);
  const hoveredRuleNodes = useMemo(() => (hoveredRule ? ruleNodes(hoveredRule) : null), [hoveredRule, ruleNodes]);

  const isNodeDimmed = (nodeId: string) => {
    if (hoveredRuleNodes) return !hoveredRuleNodes.has(nodeId);
    if (hoveredGroupFocus) return !hoveredGroupFocus.related.has(nodeId);
    if (hoveredConnector) return nodeId !== hoveredConnector.from && nodeId !== hoveredConnector.to;
    if (focusNodeId) return nodeId !== focusNodeId && !focusNeighbors?.has(nodeId);
    if (hoveredZoneFocus) return !hoveredZoneFocus.related.has(nodeId);
    if (isSearching) return !matches.has(nodeId);
    if (isShowingAttention) return !attention.nodeIds.has(nodeId);
    return false;
  };
  const isConnectorDimmed = (connector: IsoConnector) => {
    if (hoveredRule || hoveredGroupFocus) return true;
    if (hoveredConnectorId) return connector.id !== hoveredConnectorId;
    if (focusNodeId) return connector.from !== focusNodeId && connector.to !== focusNodeId;
    if (hoveredZoneFocus) {
      return !hoveredZoneFocus.members.has(connector.from) && !hoveredZoneFocus.members.has(connector.to);
    }
    if (isSearching) return !matches.has(connector.from) && !matches.has(connector.to);
    if (isShowingAttention) return !attention.nodeIds.has(connector.from) && !attention.nodeIds.has(connector.to);
    return false;
  };

  const isRuleDimmed = (rule: IsoSecurityRule) => {
    if (hoveredRuleId) return rule.id !== hoveredRuleId;
    if (hoveredGroupFocus)
      return rule.toGroup !== hoveredGroupFocus.groupId && rule.fromGroup !== hoveredGroupFocus.groupId;
    if (hoveredConnectorId) return true;
    if (focusNodeId) return !ruleNodes(rule).has(focusNodeId);
    if (hoveredZoneFocus)
      return !hoveredZoneFocus.members.has(rule.to) && !hoveredZoneFocus.members.has(rule.from ?? '');
    if (isSearching) return !matches.has(rule.to) && !matches.has(rule.from ?? '');
    if (isShowingAttention) return ![...ruleNodes(rule)].some((nodeId) => attention.nodeIds.has(nodeId));
    return false;
  };
  const isSecurityGroupDimmed = (group: IsoSecurityGroup) => {
    if (hoveredSecurityGroupId) return group.id !== hoveredSecurityGroupId;
    if (hoveredRule) return group.id !== hoveredRule.toGroup && group.id !== hoveredRule.fromGroup;
    if (focusNodeId) return !group.memberNodeIds.includes(focusNodeId);
    if (isSearching) return !group.memberNodeIds.some((id) => matches.has(id));
    if (isShowingAttention) return !group.memberNodeIds.some((id) => attention.nodeIds.has(id));
    return false;
  };
  const securityGroupHandlers = (group: IsoSecurityGroup) => ({
    onPointerEnter: () => {
      if (!isDragging) setHoveredSecurityGroupId(group.id);
    },
    onPointerLeave: () => {
      setHoveredSecurityGroupId((current) => (current === group.id ? null : current));
      setTooltip(null);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      if (isDragging) return;
      e.stopPropagation();
      moveTooltip(e, {
        title: group.name,
        subtitle: group.external ? 'Security group defined outside this stack' : 'Security group',
        summary: group.summary,
        details: group.details
      });
    }
  });
  // Larger outlines first, so a nested outline stays on top and can be hovered.
  const outlines = (scene.securityGroups ?? [])
    .flatMap((group) => group.outlines.map((outline, index) => ({ group, outline, index })))
    .sort(
      (a, b) =>
        (b.outline.to.x - b.outline.from.x) * (b.outline.to.y - b.outline.from.y) -
        (a.outline.to.x - a.outline.from.x) * (a.outline.to.y - a.outline.from.y)
    );

  const selectedNode = selectedId ? nodeMap.get(selectedId) : undefined;
  const selectedGroup: IsoGroup | undefined = selectedId
    ? scene.groups.find((group) => group.id === (selectedNode?.groupId ?? selectedId))
    : undefined;
  const expandedGroups = scene.groups.filter((group) => group.expanded);
  const isGroupSelected = Boolean(selectedGroup && (!selectedNode || selectedNode.id === selectedGroup.id));
  // An expanded group has no node of its own, so its panel summarizes its members directly.
  const selectedStatus =
    isGroupSelected && selectedGroup
      ? getGroupStatus({ group: selectedGroup, statuses: statusMap })
      : selectedNode && !selectedNode.isImplicit
        ? getResourceStatus({ resourceName: selectedNode.id, statuses: statusMap })
        : undefined;
  const ringOf = (nodeId: string): 'strong' | 'soft' | null => {
    if (nodeId === selectedId) return 'strong';
    if (nodeId === focusedNodeId || (isSearching && matches.has(nodeId))) return 'soft';
    return null;
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setQuery('');
    } else if (event.key === 'Enter') {
      // Opens the first match, in drawing order from the front.
      const first = scene.nodes.find((node) => matches.has(node.id));
      if (first) selectNode(first.id);
    }
  };

  return (
    <section
      ref={containerRef}
      aria-label={ariaLabel}
      // The labelled section is focusable because arrow keys pan it and +, -, 0 control zoom.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className={['stp-diagram', selectedNode || selectedGroup ? 'stp-diagram--panel-open' : null, className]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height, ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => {
        // A click on empty canvas closes the panel; a drag that ends there does not.
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (!selectedId || !(e.target instanceof Element)) return;
        if (e.target.closest('[data-iso-kind="node"], [data-iso-kind="group-toggle"], .stp-diagram__overlay')) return;
        setSelectedId(null);
      }}
      // The tooltip lives outside this element now, so leaving the diagram has to dismiss it here
      // as well: a shape's own leave event can be missed when the pointer exits quickly.
      onPointerLeave={() => setTooltip(null)}
      onKeyDown={onKeyDown}
    >
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        role="group"
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
        {outlines.map(({ group, outline, index }) => (
          <SecurityOutline
            key={`${group.id}-${index}`}
            group={group}
            outline={outline}
            dimmed={isSecurityGroupDimmed(group)}
            highlighted={hoveredSecurityGroupId === group.id}
            {...securityGroupHandlers(group)}
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
                title: `${nodeMap.get(c.from)?.label ?? c.from} → ${nodeMap.get(c.to)?.label ?? c.to}`,
                subtitle: EDGE_SEMANTIC_LABELS[c.semantic || 'request'],
                details: c.description
              });
            }}
          />
        ))}
        {(scene.securityRules ?? []).map((rule) => (
          <SecurityRuleArrow
            key={rule.id}
            rule={rule}
            dimmed={isRuleDimmed(rule)}
            highlighted={hoveredRuleId === rule.id}
            onPointerEnter={() => {
              if (!isDragging) setHoveredRuleId(rule.id);
            }}
            onPointerLeave={() => {
              setHoveredRuleId((current) => (current === rule.id ? null : current));
              setTooltip(null);
            }}
            onPointerMove={(e) => {
              if (isDragging) return;
              moveTooltip(e, {
                title: rule.title,
                subtitle: SECURITY_RULE_SUBTITLES[rule.source],
                details: rule.description
              });
            }}
          />
        ))}
        {sorted.map((n) => (
          <Fragment key={n.id}>
            <g
              data-iso-kind="node"
              data-iso-id={n.id}
              role="button"
              tabIndex={0}
              aria-label={[n.label, n.typeLabel, nodeStatuses.get(n.id)?.line].filter(Boolean).join(', ')}
              opacity={
                isNodeDimmed(n.id)
                  ? (isSearching || isShowingAttention) && !focusNodeId && !hoveredConnector
                    ? 0.2
                    : 0.35
                  : 1
              }
              className="stp-diagram__fade stp-diagram__node"
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
                  note: n.accessNote,
                  status: nodeStatuses
                    .get(n.id)
                    ?.entries.slice(0, 3)
                    .map((entry) => ({
                      tone: entry.tone,
                      text: n.memberCount ? `${entry.resourceName}: ${entry.text}` : entry.text,
                      detail: entry.detail
                    }))
                });
              }}
              onClick={() => {
                if (!suppressClick.current) selectNode(n.id);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                selectNode(n.id);
              }}
              onFocus={() => setFocusedNodeId(n.id)}
              onBlur={() => setFocusedNodeId((current) => (current === n.id ? null : current))}
            >
              <IsoNodeBlock idPrefix={idPrefix} node={n} ring={ringOf(n.id)} status={nodeStatuses.get(n.id)} />
            </g>
            {n.memberCount && onToggleGroup ? <GroupToggle node={n} onToggle={() => onToggleGroup(n.id)} /> : null}
          </Fragment>
        ))}
        {scene.connectors.map((c) => (
          <ConnectorLabelChip key={`${c.id}-label`} conn={c} dimmed={isConnectorDimmed(c)} />
        ))}
        {(scene.securityRules ?? []).map((rule) => (
          <SecurityRuleChip key={`${rule.id}-label`} rule={rule} dimmed={isRuleDimmed(rule)} />
        ))}
        {outlines.map(({ group, outline, index }) =>
          outline.tab ? (
            <SecurityTab
              key={`${group.id}-${index}-tab`}
              group={group}
              tile={outline.tab}
              dimmed={isSecurityGroupDimmed(group)}
              {...securityGroupHandlers(group)}
            />
          ) : null
        )}
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
            {tooltip.status && tooltip.status.length > 0 && (
              <ul className="stp-diagram__tooltip-status">
                {tooltip.status.map((status, index) => (
                  <li key={index} data-tone={status.tone}>
                    <ToneIconInline tone={status.tone} />
                    <span>
                      <strong>{status.text}</strong>
                      {status.detail && <span className="stp-diagram__tooltip-status-detail"> {status.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {tooltip.summary && <p className="stp-diagram__tooltip-summary">{tooltip.summary}</p>}
            {tooltip.details && <p className="stp-diagram__tooltip-details">{tooltip.details}</p>}
            {tooltip.note && <p className="stp-diagram__tooltip-note">{tooltip.note}</p>}
          </div>,
          document.body
        )}
      {viewNote
        ? !tooltip && <div className="stp-diagram__view-note">{viewNote}</div>
        : !tooltip &&
          !selectedNode &&
          !selectedGroup && (
            <p className="stp-diagram__hint">
              Hover to learn what something does · click a resource for its connections
            </p>
          )}
      <div className="stp-diagram__toolbar stp-diagram__overlay" onPointerDown={(e) => e.stopPropagation()}>
        {toolbar}
        <label className="stp-diagram__find">
          <BiSearch aria-hidden="true" size={15} />
          <input
            type="search"
            value={query}
            placeholder="Find resource"
            aria-label="Find resource"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </label>
        {isSearching && (
          <p className="stp-diagram__find-count" aria-live="polite">
            {matches.size === 0 ? 'No match' : `${matches.size} ${matches.size === 1 ? 'match' : 'matches'}`}
          </p>
        )}
        {attention.tone && (
          <button
            type="button"
            className="stp-diagram__chip-button stp-diagram__attention"
            data-tone={attention.tone}
            aria-pressed={isShowingAttention}
            title={isShowingAttention ? 'Show every resource' : 'Dim the resources that need no attention'}
            onClick={() => setShowAttention(!isShowingAttention)}
          >
            <ToneIconInline tone={attention.tone} />
            <span>
              {attention.resources === 1
                ? '1 resource needs attention'
                : `${attention.resources} resources need attention`}
            </span>
          </button>
        )}
        {onToggleGroup &&
          expandedGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className="stp-diagram__chip-button"
              aria-label={`Collapse ${group.label} into one node`}
              onClick={() => onToggleGroup(group.id)}
            >
              <span>{group.label}</span>
              <span className="stp-diagram__chip-action">Collapse</span>
            </button>
          ))}
        {notices && notices.length > 0 && (
          <ul className="stp-diagram__notices">
            {notices.map((notice) => (
              <li key={notice.id} className="stp-diagram__notice" data-tone={notice.tone}>
                {notice.tone === 'info' ? (
                  <BiInfoCircle aria-hidden="true" size={14} className="stp-diagram__notice-info" />
                ) : (
                  <ToneIconInline tone={notice.tone} />
                )}
                <div>{notice.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {(selectedNode || selectedGroup) && (
        <div className="stp-diagram__overlay stp-diagram__panel-frame">
          <DiagramPanel
            node={selectedNode}
            group={selectedGroup}
            headingRef={panelHeadingRef}
            canSelect={(nodeId) => nodeMap.has(nodeId)}
            onSelect={(nodeId) => setSelectedId(nodeId)}
            onClose={closePanel}
            onToggleGroup={onToggleGroup}
            onShowMember={
              onToggleGroup
                ? (groupId, memberId) => {
                    if (!nodeMap.has(memberId)) onToggleGroup(groupId);
                    setSelectedId(memberId);
                  }
                : undefined
            }
            onOpenResource={onOpenResource}
            canOpenResource={canOpenResource}
            status={selectedStatus}
            statuses={statusMap}
            onNavigate={onNavigate}
          />
        </div>
      )}
      <div className="stp-diagram__controls stp-diagram__overlay" onPointerDown={(e) => e.stopPropagation()}>
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
