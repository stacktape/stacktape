import { createEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { createSimpleContext } from './context';

/**
 * Stacktape brand palette (sourced from website/src/styles/variables.ts).
 * Single source of truth for all three TUI apps (progress, dev, launcher).
 */
export const brand = {
  accent: '#36BEBE',
  accentContrastText: '#0C1414',
  success: '#2ACF91',
  error: '#EB6161',
  warning: '#ED8B00',
  bg: '#171D1D',
  panelBg: '#202525',
  textBright: '#F4F4F5',
  text: '#DEDEDE',
  muted: '#8C8C8C',
  dim: '#5A6060'
} as const;

/** Dark theme (default). All values are hex strings for OpenTUI `fg` props. */
export const darkTheme = {
  // Semantic status
  pending: brand.dim,
  running: brand.accent,
  success: brand.success,
  error: brand.error,
  warning: brand.warning,
  rebuild: '#c084fc',

  // Text hierarchy
  text: brand.text,
  textBright: brand.textBright,
  muted: brand.muted,
  dim: brand.dim,

  // Surfaces
  bg: brand.bg,
  border: '#3a4444',
  separator: '#3a4444',

  // Accent
  blue: '#3b82f6',
  amber: brand.warning,
  purple: '#a78bfa',
  hint: '#8b5cf6',
  announce: brand.accent
} as const;

export type Theme = { -readonly [K in keyof typeof darkTheme]: string };

/** Light theme — darker, higher-contrast brand variants for light terminals. */
export const lightTheme: Theme = {
  pending: '#6b7280',
  running: '#1a9c9c',
  success: '#0d9058',
  error: '#d34848',
  warning: '#c17000',
  rebuild: '#9333ea',

  text: '#1f2937',
  textBright: '#111827',
  muted: '#4b5563',
  dim: '#9ca3af',

  bg: '#ffffff',
  border: '#d1d5db',
  separator: '#d1d5db',

  blue: '#2563eb',
  amber: '#c17000',
  purple: '#7c3aed',
  hint: '#7c3aed',
  announce: '#1a9c9c'
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
