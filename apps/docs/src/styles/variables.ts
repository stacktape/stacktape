/**
 * JS-side names for docs tokens (tokens.css), for the few components that hand a colour to a third-party React
 * component instead of styling in CSS. Values are CSS variable references, so they follow a re-brand.
 */
export const colors = {
  stacktapeGreen: 'var(--docs-accent)',
  elementBackground: 'var(--docs-bg-raised)',
  fontColorPrimary: 'var(--docs-text)'
} as const;
