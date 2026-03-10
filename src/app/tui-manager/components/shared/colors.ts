export const COLORS = {
  pending: '#6b7280',
  running: '#06b6d4',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#eab308',
  rebuild: '#c084fc',
  dim: '#4b5563',
  border: '#374151',
  text: '#d1d5db',
  textBright: '#e5e7eb',
  muted: '#9ca3af',
  bg: '#1a1a2e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#a78bfa',
  hint: '#8b5cf6',
  announce: '#3b82f6',
  separator: '#374151'
} as const;

export const MESSAGE_COLORS: Record<string, string> = {
  info: COLORS.text,
  warn: COLORS.warning,
  error: COLORS.error,
  success: COLORS.success,
  debug: COLORS.pending,
  hint: COLORS.hint,
  start: COLORS.running,
  announcement: COLORS.announce
};
