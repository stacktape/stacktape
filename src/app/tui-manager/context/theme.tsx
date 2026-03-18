import { createSimpleContext } from './helper';

/**
 * Default dark theme for Stacktape TUI.
 * All color values are hex strings compatible with OpenTUI's `fg` / `backgroundColor` props.
 */
export const defaultTheme = {
  // Semantic status
  pending: '#6b7280',
  running: '#06b6d4',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#eab308',
  rebuild: '#c084fc',

  // Text hierarchy
  text: '#d1d5db',
  textBright: '#e5e7eb',
  muted: '#9ca3af',
  dim: '#4b5563',

  // Surfaces
  bg: '#1a1a2e',
  border: '#374151',
  separator: '#374151',

  // Accent
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#a78bfa',
  hint: '#8b5cf6',
  announce: '#3b82f6'
} as const;

export type Theme = typeof defaultTheme;

/** Message-type → color mapping derived from the active theme. */
export const getMessageColors = (theme: Theme): Record<string, string> => ({
  info: theme.text,
  warn: theme.warning,
  error: theme.error,
  success: theme.success,
  debug: theme.pending,
  hint: theme.hint,
  start: theme.running,
  announcement: theme.announce
});

const { provider: ThemeProvider, use: useTheme } = createSimpleContext<{
  theme: Theme;
  messageColors: Record<string, string>;
}>({
  name: 'Theme',
  init: () => {
    const theme = defaultTheme;
    return { theme, messageColors: getMessageColors(theme) };
  }
});

export { ThemeProvider, useTheme };
