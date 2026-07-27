import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Debug file logger for tracing TUI lifecycle events.
 *
 * Enabled by setting STP_TUI_DEBUG=1 environment variable.
 * Writes to `stp-tui-debug.log` in the current working directory.
 *
 * This exists because the TUI runs on the alternate screen — any console output
 * is invisible and lost when the process exits. File logging is the only reliable
 * way to trace what happens during TUI disappearance issues.
 */

const LOG_FILE = join(process.cwd(), 'stp-tui-debug.log');
let enabled: boolean | null = null;

const isEnabled = () => {
  if (enabled === null) {
    enabled = process.env.STP_TUI_DEBUG === '1';
    if (enabled) {
      try {
        writeFileSync(LOG_FILE, `=== TUI Debug Log started ${new Date().toISOString()} ===\n`);
      } catch {}
    }
  }
  return enabled;
};

export const tuiDebug = (tag: string, message: string, data?: Record<string, unknown>) => {
  if (!isEnabled()) return;
  const ts = new Date().toISOString().slice(11, 23);
  const line = data ? `[${ts}] [${tag}] ${message} ${JSON.stringify(data)}` : `[${ts}] [${tag}] ${message}`;
  try {
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {}
};
