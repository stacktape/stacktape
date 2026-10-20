/**
 * Stacktape's shared product-dark foundation.
 *
 * A token belongs here only when more than one frontend already agrees on its exact value. Every
 * entry below was verified against `apps/console/ui/src/styles/tokens.ts` and `apps/docs/src/styles`
 * before it was promoted: the surfaces, text colours, borders, interaction colours, status colours
 * and AWS resource-category colours in this file resolve to the same effective values in both applications.
 *
 * Values that only look shared are deliberately absent. Console's `mainBackground`,
 * `darkerBackground`, `hover` and `inputHover` differ from the documentation site's, so they stay
 * application theme, and so do the v3-era palette leftovers (`vscode*`, `hackernews*`, bare
 * `orange`/`blue`/`green`) that only one consumer still reads.
 *
 * `radius`, `focus` and `motion` exist because `@stacktape/ui-react` renders into both applications
 * and its components have to agree with them on shape, focus affordance and timing. `space`,
 * `fontSize`, `fontWeight` and `dialogWidth` are the scale Console pages and `@stacktape/ui-react`
 * components are built from: page code may not use a spacing, type size or dialog width outside it.
 *
 * Adding a token here is a claim that at least two consumers must agree on its value. If only one
 * needs it, it belongs in that consumer.
 */
export const designTokens = {
  color: {
    /** Stacktape green. The one colour every Stacktape surface has to agree on. */
    brand: 'rgb(54, 190, 190)'
  },
  /** Background planes, from the page backdrop inwards. */
  surface: {
    page: 'rgb(22, 28, 28)',
    element: 'rgb(34, 40, 40)',
    modal: 'rgb(30, 35, 35)',
    input: 'rgb(20, 26, 26)'
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',
    /** Teal accent text: links and secondary emphasis. */
    secondary: 'rgba(10, 187, 181, 1)',
    headline: '#cecece',
    muted: 'rgb(160, 160, 160)',
    subtle: 'rgb(140, 140, 140)',
    faint: '#848484'
  },
  border: {
    /** The dark separating border used against page and element surfaces. */
    strong: 'rgb(8, 13, 13)',
    /** The lifted hairline used inside element surfaces. */
    subtle: 'rgb(47, 52, 52)'
  },
  /** Emphasized action and selected-state colours. These are not generic focus colours. */
  interactive: {
    primary: 'rgb(17, 105, 105)',
    primaryLight: 'rgb(34, 166, 166)',
    accent: 'rgb(34, 87, 122)'
  },
  /** Neutral field hover and focus feedback. Text inputs and selects should not turn into brand actions. */
  field: {
    /** Hover lifts the hairline a step toward the focus border; focus adds the ring. */
    hoverBorder: 'rgba(110, 116, 116, 0.38)',
    focusBorder: 'rgba(110, 116, 116, 0.56)',
    focusRing: 'rgba(110, 116, 116, 0.12)'
  },
  status: {
    error: '#eb6161',
    success: 'rgb(24, 153, 144)'
  },
  /** AWS service-category colours. Both frontends colour resources and diagrams by category. */
  awsCategory: {
    compute: 'rgb(237, 113, 0)',
    database: '#4D73F4',
    integration: '#F64683',
    security: '#F34446',
    storage: '#5CA034',
    network: '#8E58EB'
  },
  radius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  },
  /** Keyboard focus affordance. Drawn with `outline` so it never competes with a component's shadow. */
  focus: {
    outlineWidth: '2px',
    outlineOffset: '2px'
  },
  motion: {
    durationFast: '150ms',
    durationBase: '250ms',
    easing: 'ease'
  },
  /** Spacing stops on a 4 px grid, named by their size: gaps, padding, rhythm between sections. */
  space: {
    4: '4px',
    8: '8px',
    12: '12px',
    16: '16px',
    24: '24px',
    32: '32px',
    48: '48px'
  },
  /** Type sizes. `body` is the base size of product copy. */
  fontSize: {
    /** Captions, table headers, help text under a field. */
    caption: '0.75rem',
    body: '0.825rem',
    /** Section headings and emphasised rows. */
    heading: '0.9rem',
    /** Page and dialog titles. */
    title: '1.15rem',
    /** Headline numbers on tiles. */
    display: '1.5rem'
  },
  fontWeight: {
    body: '500',
    /** Labels, headings and the selected item. */
    label: '600',
    /** Headline numbers only. */
    display: '700'
  },
  /** Dialogs come in three widths: a confirmation, a form, and content such as a table or a log. */
  dialogWidth: {
    confirm: '440px',
    form: '560px',
    content: '800px'
  }
} as const;

/**
 * The same tokens as CSS-variable references, for consumers styling in CSS or in JS style objects
 * that should follow the variable rather than inline the value.
 *
 * `src/tokens.test.ts` proves this tree has exactly the same shape as `designTokens` and that every
 * reference names the variable `generated/tokens.css` actually declares.
 */
export const tokenVar = {
  color: {
    brand: 'var(--stp-color-brand)'
  },
  surface: {
    page: 'var(--stp-surface-page)',
    element: 'var(--stp-surface-element)',
    modal: 'var(--stp-surface-modal)',
    input: 'var(--stp-surface-input)'
  },
  text: {
    primary: 'var(--stp-text-primary)',
    secondary: 'var(--stp-text-secondary)',
    headline: 'var(--stp-text-headline)',
    muted: 'var(--stp-text-muted)',
    subtle: 'var(--stp-text-subtle)',
    faint: 'var(--stp-text-faint)'
  },
  border: {
    strong: 'var(--stp-border-strong)',
    subtle: 'var(--stp-border-subtle)'
  },
  interactive: {
    primary: 'var(--stp-interactive-primary)',
    primaryLight: 'var(--stp-interactive-primary-light)',
    accent: 'var(--stp-interactive-accent)'
  },
  field: {
    hoverBorder: 'var(--stp-field-hover-border)',
    focusBorder: 'var(--stp-field-focus-border)',
    focusRing: 'var(--stp-field-focus-ring)'
  },
  status: {
    error: 'var(--stp-status-error)',
    success: 'var(--stp-status-success)'
  },
  awsCategory: {
    compute: 'var(--stp-aws-category-compute)',
    database: 'var(--stp-aws-category-database)',
    integration: 'var(--stp-aws-category-integration)',
    security: 'var(--stp-aws-category-security)',
    storage: 'var(--stp-aws-category-storage)',
    network: 'var(--stp-aws-category-network)'
  },
  radius: {
    small: 'var(--stp-radius-small)',
    medium: 'var(--stp-radius-medium)',
    large: 'var(--stp-radius-large)'
  },
  focus: {
    outlineWidth: 'var(--stp-focus-outline-width)',
    outlineOffset: 'var(--stp-focus-outline-offset)'
  },
  motion: {
    durationFast: 'var(--stp-motion-duration-fast)',
    durationBase: 'var(--stp-motion-duration-base)',
    easing: 'var(--stp-motion-easing)'
  },
  space: {
    4: 'var(--stp-space-4)',
    8: 'var(--stp-space-8)',
    12: 'var(--stp-space-12)',
    16: 'var(--stp-space-16)',
    24: 'var(--stp-space-24)',
    32: 'var(--stp-space-32)',
    48: 'var(--stp-space-48)'
  },
  fontSize: {
    caption: 'var(--stp-font-size-caption)',
    body: 'var(--stp-font-size-body)',
    heading: 'var(--stp-font-size-heading)',
    title: 'var(--stp-font-size-title)',
    display: 'var(--stp-font-size-display)'
  },
  fontWeight: {
    body: 'var(--stp-font-weight-body)',
    label: 'var(--stp-font-weight-label)',
    display: 'var(--stp-font-weight-display)'
  },
  dialogWidth: {
    confirm: 'var(--stp-dialog-width-confirm)',
    form: 'var(--stp-dialog-width-form)',
    content: 'var(--stp-dialog-width-content)'
  }
} as const;

/** A token tree is exactly two levels deep: a group of related tokens, then the tokens themselves. */
export type TokenTree = Readonly<Record<string, Readonly<Record<string, string>>>>;

/**
 * Flattens a token tree into the `--stp-…` custom-property names the generated CSS declares.
 *
 * The name is the token's path in kebab-case, so `interactive.primaryLight` becomes
 * `--stp-interactive-primary-light`. Groups and tokens are emitted in authored order, which is the
 * order a reader of `designTokens` sees; nothing here depends on runtime enumeration of an unordered
 * input.
 */
export const flattenTokens = (tree: TokenTree): { name: string; value: string }[] =>
  Object.entries(tree).flatMap(([group, tokens]) =>
    Object.entries(tokens).map(([token, value]) => ({
      name: `--stp-${toKebabCase(group)}-${toKebabCase(token)}`,
      value
    }))
  );

const toKebabCase = (value: string): string => value.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
