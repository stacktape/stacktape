import { Show } from 'solid-js';
import { useTheme } from '../context/theme';
import { formatTimestamp, truncateText } from '../util/text-helpers';

export const LogRow = (props: {
  timestamp: number;
  message: string;
  color?: string;
  source?: string;
  sourceColor?: string;
  sourceWidth?: number;
}) => {
  const { theme } = useTheme();
  const srcWidth = () => props.sourceWidth ?? 16;

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {formatTimestamp(props.timestamp)}{' '}
      </text>
      <Show when={props.source}>
        <text flexShrink={0} wrapMode="none" fg={props.sourceColor ?? theme.muted}>
          {truncateText(props.source!, srcWidth()).padEnd(srcWidth())}{' '}
        </text>
      </Show>
      <text fg={props.color ?? theme.text}>{props.message}</text>
    </box>
  );
};
