import type { WorkloadColor } from '../types';
import { WORKLOAD_COLORS } from '../types';

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

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Map workload names to colors for consistent coloring
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

// Truncate string with ellipsis
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '...';
};

// Pad string to fixed width
export const padEnd = (str: string, length: number): string => {
  if (str.length >= length) return str.slice(0, length);
  return str + ' '.repeat(length - str.length);
};
