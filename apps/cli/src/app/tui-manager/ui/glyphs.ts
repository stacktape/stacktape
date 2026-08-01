/**
 * Single source of truth for every glyph the TUI draws. The set is restricted
 * to characters that render single-cell in Windows Terminal, macOS Terminal,
 * iTerm2 and common Linux emulators (Unicode EastAsianWidth Neutral/Ambiguous,
 * verified against mainstream monospace fonts). Swapping the visual language
 * is a one-file change; info/warning deliberately use ASCII to avoid
 * emoji-style rendering of ℹ/⚠ in some terminals.
 */
export const glyphs = {
  success: '✓', // check mark
  error: '✗', // ballot x
  current: '●', // black circle - active phase in the rail
  pending: '·', // middle dot - pending phase / separator
  separator: '·', // middle dot
  info: 'i',
  warning: '!',
  selected: '›', // single right-pointing angle quote
  rule: '─', // box drawings light horizontal
  accentBar: '▌', // left half block - prompt/status blocks
  gutter: '│', // box drawings light vertical - output gutter
  treeBranch: '├', // tree branch
  treeEnd: '└', // tree end
  barFilled: '█', // full block - progress bar fill
  barEmpty: '░', // light shade - progress bar track
  external: '↗', // north east arrow - external link
  spinnerFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
} as const;
