import { createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { createSimpleContext } from './helper';

/**
 * Dark theme (default). All values are hex strings for OpenTUI `fg` props.
 *
 * Brand colors: swap the accent values below with the official Stacktape palette
 * when available — `running` is the primary accent, `success`/`error`/`warning`
 * the semantic status colors.
 */
export const darkTheme = {
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
  dim: '#6b7280',

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

export type Theme = { -readonly [K in keyof typeof darkTheme]: string };

/** Light theme — darker, higher-contrast variants for light terminals. */
export const lightTheme: Theme = {
  pending: '#6b7280',
  running: '#0891b2',
  success: '#16a34a',
  error: '#dc2626',
  warning: '#ca8a04',
  rebuild: '#9333ea',

  text: '#1f2937',
  textBright: '#111827',
  muted: '#4b5563',
  dim: '#9ca3af',

  bg: '#ffffff',
  border: '#d1d5db',
  separator: '#d1d5db',

  blue: '#2563eb',
  amber: '#d97706',
  purple: '#7c3aed',
  hint: '#7c3aed',
  announce: '#2563eb'
};

export type ThemeMode = 'light' | 'dark';

/**
 * Module-level detected terminal scheme. The renderer feeds this (see
 * opentui-renderer.ts) once the terminal reports light/dark; ThemeProvider
 * subscribes reactively, so the footer and future scrollback items repaint in
 * the right palette without re-mounting.
 */
const [themeMode, setThemeModeSignal] = createSignal<ThemeMode>('dark');

export const setDetectedThemeMode = (mode: ThemeMode) => setThemeModeSignal(mode);

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

const paletteFor = (mode: ThemeMode): Theme => (mode === 'light' ? lightTheme : { ...darkTheme });

const { provider: ThemeProvider, use: useTheme } = createSimpleContext<{
  theme: Theme;
  messageColors: Record<string, string>;
}>({
  name: 'Theme',
  init: () => {
    // Stores keep property/index reads (`theme.success`, `messageColors[type]`)
    // reactive, so detected-mode changes repaint without touching call sites.
    const [theme, setTheme] = createStore<Theme>(paletteFor(themeMode()));
    const [messageColors, setMessageColors] = createStore<Record<string, string>>(
      getMessageColors(paletteFor(themeMode()))
    );
    createEffect(() => {
      const palette = paletteFor(themeMode());
      setTheme(palette);
      setMessageColors(getMessageColors(palette));
    });
    return { theme, messageColors };
  }
});

export { ThemeProvider, useTheme };
