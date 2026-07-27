import { ScrollbackQueue } from '../scrollback-feed';
import type { LogLevel as DevLogLevel } from './types';

export type DevScrollbackItem =
  | {
      kind: 'log';
      source: string;
      sourceType: 'workload' | 'hook' | 'system';
      level: DevLogLevel;
      message: string;
      timestamp: number;
    }
  | { kind: 'status'; level: 'info' | 'success' | 'error' | 'warn'; text: string; timestamp: number };

/**
 * Dev-mode terminal record: workload/system log lines and lifecycle status
 * lines stream here and are written above the split-footer. The terminal's
 * own scrollback replaces the old filterable in-TUI log panel.
 */
export const devScrollbackFeed = new ScrollbackQueue<DevScrollbackItem>();
