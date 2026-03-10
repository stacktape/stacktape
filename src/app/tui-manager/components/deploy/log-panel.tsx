import { Show, For } from 'solid-js';
import { createTuiSignal } from './use-deploy-state';
import type { TuiMessage, TuiWarning } from '../../types';
import { COLORS, MESSAGE_COLORS } from '../shared/colors';
import { LogRow } from '../shared/log-row';

type LogEntry = {
  key: string;
  timestamp: number;
  text: string;
  color: string;
};

const messagesToEntries = (messages: TuiMessage[]): LogEntry[] =>
  messages.map((msg) => ({
    key: msg.id,
    timestamp: msg.timestamp,
    text: msg.message,
    color: MESSAGE_COLORS[msg.type] || COLORS.text
  }));

const warningsToEntries = (warnings: TuiWarning[]): LogEntry[] =>
  warnings.map((w) => ({
    key: w.id,
    timestamp: w.timestamp,
    text: `Warning: ${w.message}`,
    color: COLORS.warning
  }));

export const LogPanel = () => {
  const messages = createTuiSignal((s) => s.messages);
  const warnings = createTuiSignal((s) => s.warnings);

  const entries = () =>
    [...messagesToEntries(messages()), ...warningsToEntries(warnings())].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS.border}
      height="40%"
      minHeight={5}
      paddingX={1}
    >
      <box height={1}>
        <text fg={COLORS.muted}>
          <b>Log</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true}>
        <Show when={entries().length > 0} fallback={<text fg={COLORS.dim}>No log entries yet</text>}>
          <For each={entries()}>
            {(entry) => <LogRow timestamp={entry.timestamp} message={entry.text} color={entry.color} />}
          </For>
        </Show>
      </scrollbox>
    </box>
  );
};
