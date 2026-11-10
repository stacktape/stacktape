/**
 * How live status is drawn: a ring on the floor around a node that needs attention, a pill under its name tag, and the
 * tone icon both use. Every mark carries words as well as colour; the icon's shape differs per tone too.
 */
import type { DiagramStatusTone, NodeStatus } from './status.js';
import type { IsoNode } from './scene.js';
import {
  STATUS_CHAR_PX,
  STATUS_PILL_CHROME_PX,
  STATUS_PILL_HEIGHT_PX,
  STATUS_PILL_TOP_PX,
  getStatusTextBudget
} from './node-appearance.js';
import { pts, t2s } from './projection.js';
import { needsAttention } from './status.js';

/** Stroke and icon colour, and the lighter text colour that reads on the dark pill. */
export const TONE_COLORS: Record<DiagramStatusTone, { mark: string; text: string }> = {
  critical: { mark: '#F0565C', text: '#FFC2C4' },
  warning: { mark: '#F2A93B', text: '#FFDDA6' },
  ok: { mark: '#3DC98A', text: '#B4F0D2' },
  unknown: { mark: '#8E9AAB', text: '#CBD3DD' }
};

export const TONE_NAMES: Record<DiagramStatusTone, string> = {
  critical: 'Failing',
  warning: 'Needs attention',
  ok: 'Healthy',
  unknown: 'Unknown'
};

const truncate = (text: string, maxChars: number) =>
  text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

/**
 * A tone's icon, centred on `(cx, cy)` with radius `r`: a disc with "!" when failing, a triangle with "!" when it needs
 * attention, a disc with a tick when healthy and an open ring when unknown.
 */
export function ToneIcon({ tone, cx, cy, r }: { tone: DiagramStatusTone; cx: number; cy: number; r: number }) {
  const { mark } = TONE_COLORS[tone];
  const bang = (top: number, bottom: number, dot: number) => (
    <>
      <path d={`M ${cx} ${top} V ${bottom}`} stroke="#0B0D12" strokeWidth={r * 0.32} strokeLinecap="round" />
      <circle cx={cx} cy={dot} r={r * 0.17} fill="#0B0D12" />
    </>
  );
  switch (tone) {
    case 'critical':
      return (
        <g data-iso-tone-icon="critical">
          <circle cx={cx} cy={cy} r={r} fill={mark} />
          {bang(cy - r * 0.5, cy + r * 0.08, cy + r * 0.5)}
        </g>
      );
    case 'warning':
      return (
        <g data-iso-tone-icon="warning">
          <path
            d={`M ${cx} ${cy - r * 1.05} L ${cx + r * 1.1} ${cy + r * 0.85} L ${cx - r * 1.1} ${cy + r * 0.85} Z`}
            fill={mark}
            strokeLinejoin="round"
            stroke={mark}
            strokeWidth={r * 0.3}
          />
          {bang(cy - r * 0.42, cy + r * 0.18, cy + r * 0.55)}
        </g>
      );
    case 'ok':
      return (
        <g data-iso-tone-icon="ok">
          <circle cx={cx} cy={cy} r={r} fill={mark} />
          <path
            d={`M ${cx - r * 0.45} ${cy + r * 0.02} L ${cx - r * 0.1} ${cy + r * 0.38} L ${cx + r * 0.48} ${cy - r * 0.35}`}
            fill="none"
            stroke="#0B0D12"
            strokeWidth={r * 0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    default:
      return (
        <g data-iso-tone-icon="unknown">
          <circle cx={cx} cy={cy} r={r * 0.85} fill="none" stroke={mark} strokeWidth={r * 0.3} />
        </g>
      );
  }
}

/** The same icon as a small inline image for the panel and toolbar. */
export function ToneIconInline({ tone, size = 12 }: { tone: DiagramStatusTone; size?: number }) {
  return (
    <svg
      className="stp-diagram__tone-icon"
      width={size}
      height={size}
      viewBox="-6 -6 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <ToneIcon tone={tone} cx={0} cy={0} r={5} />
    </svg>
  );
}

/**
 * A ring on the floor around a node that is failing (solid) or needs attention (dashed), just outside the selection
 * ring so both can show.
 */
export function NodeStatusRing({
  node,
  tone,
  halfWidth
}: {
  node: IsoNode;
  tone: DiagramStatusTone;
  halfWidth: number;
}) {
  if (!needsAttention(tone)) return null;
  const reach = halfWidth + 0.3;
  const { x, y } = node.tile;
  const { mark } = TONE_COLORS[tone];
  return (
    <polygon
      data-iso-kind="status-ring"
      data-iso-tone={tone}
      points={pts(
        t2s(x - reach, y - reach),
        t2s(x + reach, y - reach),
        t2s(x + reach, y + reach),
        t2s(x - reach, y + reach)
      )}
      fill={mark}
      fillOpacity={tone === 'critical' ? 0.14 : 0.08}
      stroke={mark}
      strokeOpacity={0.85}
      strokeWidth={tone === 'critical' ? 1.8 : 1.5}
      strokeDasharray={tone === 'critical' ? undefined : '6 4'}
    />
  );
}

/** The status line under a node's name tag: the tone icon and the node's line in a dark pill edged in its tone. */
export function NodeStatusPill({
  node,
  status,
  tip
}: {
  node: IsoNode;
  status: NodeStatus;
  tip: { x: number; y: number };
}) {
  // The count of further statuses survives truncation; the text gives way.
  const suffix = status.more > 0 ? ` +${status.more}` : '';
  const text = truncate(status.text, getStatusTextBudget(node) - suffix.length) + suffix;
  const width = text.length * STATUS_CHAR_PX + STATUS_PILL_CHROME_PX - 4;
  const top = tip.y + STATUS_PILL_TOP_PX;
  const left = tip.x - width / 2;
  const middle = top + STATUS_PILL_HEIGHT_PX / 2;
  const colors = TONE_COLORS[status.tone];
  return (
    <g data-iso-kind="node-status" data-iso-tone={status.tone}>
      <rect
        x={left}
        y={top}
        width={width}
        height={STATUS_PILL_HEIGHT_PX}
        rx={STATUS_PILL_HEIGHT_PX / 2}
        fill="rgba(9, 11, 17, 0.9)"
        stroke={colors.mark}
        strokeOpacity={0.75}
        strokeWidth={1}
      />
      <ToneIcon tone={status.tone} cx={left + 10} cy={middle} r={4.6} />
      <text
        x={left + 18 + (text.length * STATUS_CHAR_PX) / 2}
        y={middle + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={10}
        fontWeight={600}
        fontFamily="'Montserrat', 'Inter', sans-serif"
      >
        {text}
      </text>
    </g>
  );
}
