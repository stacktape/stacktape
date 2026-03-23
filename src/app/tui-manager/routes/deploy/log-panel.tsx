import { Show, For } from 'solid-js';
import { createTuiSignal } from '../../context/deploy-state';
import { useTheme } from '../../context/theme';
import type { TuiMessage, TuiWarning } from '../../types';
import { LogRow } from '../../ui/log-row';

type LogEntry = {
  key: string;
  timestamp: number;
  text: string;
  color: string;
};

export const LogPanel = () => {
  const { theme, messageColors } = useTheme();
  const messages = createTuiSignal((s) => s.messages);
  const warnings = createTuiSignal((s) => s.warnings);

  const messagesToEntries = (msgs: TuiMessage[]): LogEntry[] =>
    msgs.map((msg) => ({
      key: msg.id,
      timestamp: msg.timestamp,
      text: msg.message,
      color: messageColors[msg.type] || theme.text
    }));

  const warningsToEntries = (warns: TuiWarning[]): LogEntry[] =>
    warns.map((w) => ({
      key: w.id,
      timestamp: w.timestamp,
      text: `Warning: ${w.message}`,
      color: theme.warning
    }));

  const entries = () =>
    [...messagesToEntries(messages()), ...warningsToEntries(warnings())].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <box flexDirection="column" borderStyle="single" borderColor={theme.border} height="40%" minHeight={6} paddingX={1}>
      <box height={1}>
        <text fg={theme.muted}>
          <b>Log</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} focused={true}>
        <Show when={entries().length > 0} fallback={<text fg={theme.dim}>No log entries yet</text>}>
          <For each={entries()}>
            {(entry) => <LogRow timestamp={entry.timestamp} message={entry.text} color={entry.color} />}
          </For>
        </Show>
      </scrollbox>
    </box>
  );
};
