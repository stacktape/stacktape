/**
 * Stacktape brand primitives.
 *
 * This package owns only what more than one frontend genuinely shares. Today that is the brand
 * colour: the documentation site and the marketing site must render the same Stacktape green.
 * Everything else — palettes, typography, spacing, component recipes — is application theme and
 * stays with the application that decides it.
 *
 * Adding a token here is a claim that at least two applications must agree on its value. If only one
 * consumer needs it, it belongs in that consumer.
 */
export const designTokens = {
  color: {
    /** Stacktape green. The one colour every Stacktape surface has to agree on. */
    brand: 'rgb(54, 190, 190)'
  }
} as const;

/** The same primitives as CSS-variable references, for consumers styling in CSS. */
export const tokenVar = {
  color: {
    brand: 'var(--stp-color-brand)'
  }
} as const;
