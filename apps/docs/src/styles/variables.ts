import { designTokens } from '@stacktape/design-tokens';

/**
 * The JS-side twin of the `@theme` block in global.css, for the few components that pass a colour to
 * a third-party React component instead of styling in CSS.
 *
 * Values referencing `designTokens` are the shared Stacktape foundation; the literals below them are
 * this site's own theme and no other frontend agrees on them.
 */
const { awsCategory, border, color, interactive, status, surface, text } = designTokens;

const mainBackground = 'rgb(28,33,33)';

export const colors = {
  primary: interactive.primary,
  primaryLighter: interactive.primaryLight,
  secondary: interactive.accent,
  secondaryDisabled: interactive.accent,
  pageBackground: surface.page,
  elementBackground: surface.element,
  modalBackground: surface.modal,
  inputBackground: surface.input,
  borderColor: border.strong,
  borderColorLight: border.subtle,
  fontColorPrimary: text.primary,
  fontColorSecondary: text.secondary,
  fontColorLightGray: text.subtle,
  fontColorLighterGray: text.muted,
  fontColorTernary: text.faint,
  fontColorHeadline: text.headline,
  error: status.error,
  success: status.success,
  awsResourceCompute: awsCategory.compute,
  awsResourceDatabase: awsCategory.database,
  awsResourceIntegration: awsCategory.integration,
  awsResourceSecurity: awsCategory.security,
  awsResourceStorage: awsCategory.storage,
  awsResourceNetwork: awsCategory.network,
  brandGreen: color.brand,
  stacktapeGreen: color.brand,

  // This site's own theme.
  navigationHover: 'rgba(255,255,255,0.75)',
  primaryDisabled: 'rgb(21, 114, 120)',
  primaryButtonBorder: '#40958e',
  secondaryButtonBorder: 'rgb(69,151,203)',
  backgroundColor: mainBackground,
  darkerBackground: 'rgb(22,27,27)',
  highlightedCodeLine: 'rgb(53, 59, 69)',
  inputHover: 'rgb(25, 31, 31)',
  scrollbarColor: '#131313',
  gray: '#9a9a9a',
  darkGrey: '#2D2D2D',
  hackernews: 'rgb(255, 102, 0)',
  hackernewsBackground: 'rgb(246, 246, 239)',
  lightGray: '#a6a5a5',
  hoverColorDarkGray: 'rgb(27,32,32)',
  hover: 'rgb(35, 40, 40)',
  listItemHoverColor: 'rgb(45, 50, 50)',
  launchWeekBorder: 'rgb(40.5,40.5,40.5)',
  imgFilterPrimary: 'invert(71%) sepia(25%) saturate(2%) hue-rotate(314deg) brightness(108%) contrast(102%)',
  imgFilterSecondary: 'invert(63%) sepia(93%) saturate(2270%) hue-rotate(133deg) brightness(91%) contrast(92%)',
  vscodeBlue: '#569CD6',
  vscodeLighterBlue: 'rgb(102 160 208)',
  vscodeOrange: '#CE9178',
  vscodeLightGray: '#D4D4D4',
  vscodeNumberGreen: '#B5CEA8',
  vscodeCommentGreen: '#608b4e',
  orange: '#ED8B00',
  orangeLight: '#FBE9D0',
  white: '#FFFFFF',
  black: '#000000',
  green: '#00965E',
  greenLight: '#D0EBE1',
  blue: '#0066CC',
  tableBoxShadow: 'rgb(35,35,35)',
  vscodeBackground: '#1E1E1E'
} as const;

export const pageLayout = {
  headerHeight: 54,
  maxPageWidth: 1580
} as const;

// Geist Mono is loaded by the <link> stylesheet in the layout head; this only names it for JS-side
// styles. Keep in sync with `--font-mono` in global.css.
export const fontFamilyMono = "Geist Mono, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
