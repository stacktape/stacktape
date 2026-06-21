import type { WorkloadColor } from './types';
import { WORKLOAD_COLORS } from './types';

export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m${remainingSeconds}s`;
};

const workloadColorMap = new Map<string, WorkloadColor>();
let colorIndex = 0;

export const getWorkloadColor = (workloadName: string): WorkloadColor => {
  if (!workloadColorMap.has(workloadName)) {
    workloadColorMap.set(workloadName, WORKLOAD_COLORS[colorIndex % WORKLOAD_COLORS.length]);
    colorIndex++;
  }
  return workloadColorMap.get(workloadName)!;
};

export const resetWorkloadColors = () => {
  workloadColorMap.clear();
  colorIndex = 0;
};

const discardCurrentLine = (text: string): string => {
  const lastNewline = text.lastIndexOf('\n');
  return lastNewline === -1 ? '' : text.slice(0, lastNewline + 1);
};

/**
 * Normalizes raw process output into clean printable lines: strips ANSI/OSC/DCS
 * escape sequences and control chars, expands tabs, and collapses `\r`-overwrite
 * progress-bar frames into their final state.
 */
export const normalizeLogLines = (message: string): string[] => {
  let clean = '';
  for (let i = 0; i < message.length; i++) {
    const code = message.charCodeAt(i);

    // ESC-initiated sequences
    if (code === 27) {
      const next = message[i + 1];
      if (next === '[') {
        // CSI sequence: ESC [ <params> <final byte>
        i += 2;
        while (i < message.length) {
          const c = message.charCodeAt(i);
          if (c >= 64 && c <= 126) break;
          i++;
        }
        continue;
      }
      if (next === ']') {
        // OSC sequence: ESC ] ... (ST | BEL)
        i += 2;
        while (i < message.length) {
          if (message.charCodeAt(i) === 7) break;
          if (message.charCodeAt(i) === 27 && message[i + 1] === '\\') {
            i++;
            break;
          }
          i++;
        }
        continue;
      }
      if (next === '(' || next === ')' || next === '*' || next === '+') {
        i += 2;
        continue;
      }
      if (next === 'P') {
        // DCS: ESC P ... ST
        i += 2;
        while (i < message.length) {
          if (message.charCodeAt(i) === 27 && message[i + 1] === '\\') {
            i++;
            break;
          }
          i++;
        }
        continue;
      }
      i++;
      continue;
    }

    // 8-bit CSI (0x9B)
    if (code === 0x9b) {
      i++;
      while (i < message.length) {
        const c = message.charCodeAt(i);
        if (c >= 64 && c <= 126) break;
        i++;
      }
      continue;
    }

    // Carriage return: trailing \r is stripped; mid-line \r is a progress-bar
    // overwrite — discard the partial line it replaces.
    if (code === 13) {
      const nextIdx = i + 1;
      if (nextIdx >= message.length || message.charCodeAt(nextIdx) === 10) {
        continue;
      }
      clean = discardCurrentLine(clean);
      continue;
    }

    if (code === 9) {
      clean += '  ';
      continue;
    }
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      continue;
    }
    clean += message[i];
  }

  const lines = clean
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  return lines.length > 0 ? lines : [''];
};
