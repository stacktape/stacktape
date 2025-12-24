// Utility functions for the TUI

import type { TaskStatus } from './types';

// Format duration in human readable format (e.g., "2.1s", "1m 23s")
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
  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

// Format duration as MM:SS for elapsed time display
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Format bytes to human readable (e.g., "12.4 MB")
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
};

// Check if we're in a TTY environment
export const isTTY = (): boolean => {
  return process.stdout.isTTY === true;
};

// Get terminal width with fallback
export const getTerminalWidth = (): number => {
  return process.stdout.columns || 80;
};

// Truncate text to fit width, adding ellipsis
export const truncate = (text: string, maxWidth: number): string => {
  if (text.length <= maxWidth) return text;
  return `${text.slice(0, maxWidth - 1)}…`;
};

// Pad string to fixed width
export const padEnd = (text: string, width: number): string => {
  if (text.length >= width) return text;
  return text + ' '.repeat(width - text.length);
};

export const padStart = (text: string, width: number): string => {
  if (text.length >= width) return text;
  return ' '.repeat(width - text.length) + text;
};

// Get status from CloudFormation resource status string
export const cfStatusToTaskStatus = (cfStatus: string): TaskStatus => {
  if (cfStatus.includes('COMPLETE') && !cfStatus.includes('FAILED')) {
    return 'success';
  }
  if (cfStatus.includes('FAILED')) {
    return 'error';
  }
  if (cfStatus.includes('IN_PROGRESS')) {
    return 'active';
  }
  if (cfStatus.includes('ROLLBACK')) {
    return 'warning';
  }
  return 'pending';
};

// Create a simple progress bar string
export const createProgressBar = (current: number, total: number, width: number): { filled: number; empty: number } => {
  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return { filled, empty };
};

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};
