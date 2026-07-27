import { Switch, Match } from 'solid-js';
import type { DevScrollbackItem } from '../../dev-tui/dev-scrollback-feed';
import { getWorkloadColor } from '../../dev-tui/utils';
import type { WorkloadColor } from '../../dev-tui/types';
import { ThemeProvider, useTheme } from '../../context/theme';

const WORKLOAD_COLOR_HEX: Record<WorkloadColor, string> = {
  cyan: '#06b6d4',
  magenta: '#c084fc',
  yellow: '#eab308',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  white: '#e5e7eb',
  gray: '#9ca3af'
};

const STATUS_SYMBOLS = { info: 'ℹ', success: '✓', error: '✗', warn: '▲' } as const;

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });

const LogLineView = (props: { item: Extract<DevScrollbackItem, { kind: 'log' }> }) => {
  const { theme } = useTheme();
  const sourceColor = () =>
    props.item.sourceType === 'system' ? theme.muted : WORKLOAD_COLOR_HEX[getWorkloadColor(props.item.source)];
  const messageColor = () =>
    props.item.level === 'error' ? theme.error : props.item.level === 'warn' ? theme.warning : theme.text;

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {formatTime(props.item.timestamp)}{' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={sourceColor()}>
        [{props.item.source}]{' '}
      </text>
      <text fg={messageColor()}>{props.item.message}</text>
    </box>
  );
};

const StatusLineView = (props: { item: Extract<DevScrollbackItem, { kind: 'status' }> }) => {
  const { theme, messageColors } = useTheme();
  const color = () => messageColors[props.item.level] ?? theme.text;

  return (
    <box flexDirection="row">
      <text flexShrink={0} wrapMode="none" fg={theme.dim}>
        {formatTime(props.item.timestamp)}{' '}
      </text>
      <text flexShrink={0} wrapMode="none" fg={color()}>
        {STATUS_SYMBOLS[props.item.level]}{' '}
      </text>
      <text fg={color()}>{props.item.text}</text>
    </box>
  );
};

export const DevScrollbackItemView = (props: { item: DevScrollbackItem; width: number }) => {
  return (
    <ThemeProvider>
      <box width={props.width} flexDirection="column">
        <Switch>
          <Match when={props.item.kind === 'log'}>
            <LogLineView item={props.item as Extract<DevScrollbackItem, { kind: 'log' }>} />
          </Match>
          <Match when={props.item.kind === 'status'}>
            <StatusLineView item={props.item as Extract<DevScrollbackItem, { kind: 'status' }>} />
          </Match>
        </Switch>
      </box>
    </ThemeProvider>
  );
};
