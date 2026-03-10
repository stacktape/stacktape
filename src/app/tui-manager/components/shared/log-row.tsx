import { Show } from 'solid-js';
import { COLORS } from './colors';
import { formatTimestamp, truncateText } from './text-helpers';

// Reusable log row with proper Yoga layout:
// - Timestamp and optional source label use flexShrink={0} to prevent compression
// - Message text wraps naturally (no wrapMode="none") so long lines don't clip
export const LogRow = (props: {
  timestamp: number;
  message: string;
  color?: string;
  source?: string;
  sourceColor?: string;
  sourceWidth?: number;
}) => {
  const srcWidth = () => props.sourceWidth ?? 16;

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
        {formatTimestamp(props.timestamp)}{' '}
      </text>
      <Show when={props.source}>
        <text flexShrink={0} wrapMode="none" fg={props.sourceColor ?? COLORS.muted}>
          {truncateText(props.source!, srcWidth()).padEnd(srcWidth())}{' '}
        </text>
      </Show>
      <text fg={props.color ?? COLORS.text}>{props.message}</text>
    </box>
  );
};
