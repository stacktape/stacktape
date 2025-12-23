// Color palette and theme for the TUI
// Modern CLI aesthetics with consistent color scheme

export const colors = {
  // Primary brand colors
  primary: '#38BDF8', // Cyan/Sky blue
  secondary: '#2DD4BF', // Teal

  // Status colors
  success: '#10B981', // Emerald green
  warning: '#FBBF24', // Amber
  error: '#EF4444', // Red
  info: '#60A5FA', // Blue

  // Neutral palette
  white: '#F8FAFC',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Accent colors
  purple: '#A855F7',
  pink: '#EC4899',
  orange: '#F97316',
  yellow: '#EAB308'
} as const;

// Semantic color mappings
export const semantic = {
  // Task status colors
  taskPending: colors.gray500,
  taskActive: colors.primary,
  taskSuccess: colors.success,
  taskError: colors.error,
  taskWarning: colors.warning,

  // UI elements
  border: colors.gray600,
  borderDim: colors.gray700,
  text: colors.white,
  textMuted: colors.gray400,
  textDim: colors.gray500,

  // Special elements
  header: colors.primary,
  headerText: colors.white,
  hint: colors.info,
  link: colors.primary
} as const;

// Check if terminal supports Unicode
export const supportsUnicode = (): boolean => {
  if (process.platform === 'win32') {
    return (
      process.env.TERM_PROGRAM === 'vscode' ||
      !!process.env.WT_SESSION ||
      !!process.env.ConEmuTask ||
      process.env.TERM === 'xterm-256color'
    );
  }
  return true;
};

const unicode = supportsUnicode();

// Symbols used throughout the UI
export const symbols = {
  // Status indicators
  success: unicode ? '✓' : '+',
  error: unicode ? '✗' : 'x',
  warning: unicode ? '⚠' : '!',
  info: unicode ? 'ℹ' : 'i',
  pending: unicode ? '○' : 'o',
  active: unicode ? '◐' : '*',

  // Box drawing (rounded)
  topLeft: unicode ? '╭' : '+',
  topRight: unicode ? '╮' : '+',
  bottomLeft: unicode ? '╰' : '+',
  bottomRight: unicode ? '╯' : '+',
  horizontal: unicode ? '─' : '-',
  vertical: unicode ? '│' : '|',

  // Tree structure
  treeCorner: unicode ? '└─' : '\\-',
  treeBranch: unicode ? '├─' : '|-',
  treeVertical: unicode ? '│' : '|',

  // Progress
  progressFull: unicode ? '█' : '#',
  progressEmpty: unicode ? '░' : '-',

  // Arrows and pointers
  arrowRight: unicode ? '→' : '->',
  arrowLeft: unicode ? '←' : '<-',
  pointer: unicode ? '▸' : '>',

  // Special
  bullet: unicode ? '•' : '*',
  ellipsis: unicode ? '…' : '...',
  clock: unicode ? '⏱' : '[t]',
  lightbulb: unicode ? '💡' : '[!]',

  // Separators
  lineDash: unicode ? '─' : '-',
  lineDouble: unicode ? '═' : '='
} as const;

// Spinner frames for animation
export const spinnerFrames = unicode ? ['◐', '◓', '◑', '◒'] : ['-', '\\', '|', '/'];
