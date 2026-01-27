export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

/**
 * Strip ANSI escape codes for accurate length calculation
 */
export const stripAnsi = (str?: string): string => {
  if (!str) return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
};

export const formatPhaseTimer = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Calculate elapsed time for a phase/event, handling both running and completed states.
 */
export const getElapsedTime = (startTime: number | undefined, duration: number | undefined): number => {
  if (duration !== undefined) return duration;
  if (startTime === undefined) return 0;
  return Date.now() - startTime;
};
