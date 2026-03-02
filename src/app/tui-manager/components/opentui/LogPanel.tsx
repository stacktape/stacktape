/** @jsxImportSource @opentui/react */

import { useTuiState } from './use-tui-state';
import type { TuiMessage, TuiWarning } from '../../types';

type LogEntry = {
  key: string;
  timestamp: number;
  text: string;
  color: string;
};

const MESSAGE_COLORS: Record<string, string> = {
  info: '#d1d5db',
  warn: '#eab308',
  error: '#ef4444',
  success: '#22c55e',
  debug: '#6b7280',
  hint: '#8b5cf6',
  start: '#06b6d4',
  announcement: '#3b82f6'
};

const formatTimestamp = (ts: number) => {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const messagesToEntries = (messages: TuiMessage[]): LogEntry[] =>
  messages.map((msg) => ({
    key: msg.id,
    timestamp: msg.timestamp,
    text: msg.message,
    color: MESSAGE_COLORS[msg.type] || '#d1d5db'
  }));

const warningsToEntries = (warnings: TuiWarning[]): LogEntry[] =>
  warnings.map((w) => ({
    key: w.id,
    timestamp: w.timestamp,
    text: `Warning: ${w.message}`,
    color: '#eab308'
  }));

export const LogPanel = () => {
  const messages = useTuiState((s) => s.messages);
  const warnings = useTuiState((s) => s.warnings);

  const entries = [...messagesToEntries(messages), ...warningsToEntries(warnings)].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <box flexDirection="column" borderStyle="single" borderColor="#374151" height="40%" minHeight={5} paddingX={1}>
      <box height={1}>
        <text fg="#9ca3af">
          <b>Log</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true}>
        {entries.length === 0 ? (
          <text fg="#4b5563">No log entries yet</text>
        ) : (
          entries.map((entry) => (
            <box key={entry.key} flexDirection="row">
              <text fg="#4b5563">{formatTimestamp(entry.timestamp)} </text>
              <text fg={entry.color}>{entry.text}</text>
            </box>
          ))
        )}
      </scrollbox>
    </box>
  );
};
