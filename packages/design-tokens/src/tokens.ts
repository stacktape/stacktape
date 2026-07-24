export const designTokens = {
  color: {
    accent: '#6155f5',
    canvas: '#0d0f14',
    text: '#f5f7ff'
  },
  font: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif'
  },
  space: {
    6: '1.5rem',
    12: '3rem',
    16: '4rem'
  }
} as const;

export const tokenVar = {
  color: {
    accent: 'var(--stp-color-accent)',
    canvas: 'var(--stp-color-canvas)',
    text: 'var(--stp-color-text)'
  },
  font: {
    sans: 'var(--stp-font-sans)'
  },
  space: {
    6: 'var(--stp-space-6)',
    12: 'var(--stp-space-12)',
    16: 'var(--stp-space-16)'
  }
} as const;
