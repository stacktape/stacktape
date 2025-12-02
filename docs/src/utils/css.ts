import { CSSObject } from '@emotion/react';

/**
 * Utility function to merge CSS objects, similar to clsx/cn but for Emotion CSS objects
 * Filters out falsy values and merges objects
 */
export function mergeCss(...styles: (CSSObject | undefined | null | false)[]): CSSObject {
  return styles
    .filter((style): style is CSSObject => Boolean(style))
    .reduce((acc, style) => ({ ...acc, ...style }), {} as CSSObject);
}

/**
 * Conditional CSS utility - returns the CSS object if condition is true, otherwise undefined
 */
export function conditionalCss(condition: boolean, css: CSSObject): CSSObject | undefined {
  return condition ? css : undefined;
}
