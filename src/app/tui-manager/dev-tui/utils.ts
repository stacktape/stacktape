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
