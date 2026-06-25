import { geistMonoFont } from '@/styles/fonts';

export const mainBackground = 'rgb(28,33,33)';
export const pageBackground = 'rgb(22,28,28)';
export const elementBackground = 'rgb(34,40,40)';
const tableBoxShadow = 'rgb(35,35,35)';

export const colors = {
  primary: 'rgb(17 105 105)',
  primaryLighter: 'rgb(34, 166, 166)',
  navigationHover: 'rgba(255,255,255,0.75)',
  primaryDisabled: 'rgb(21, 114, 120)',
  borderColor: 'rgb(8, 13, 13)',
  borderColorLight: 'rgb(47,52,52)',
  primaryButtonBorder: '#40958e',
  secondary: 'rgb(34, 87, 122)',
  secondaryDisabled: 'rgb(34, 87, 122)',
  secondaryButtonBorder: 'rgb(69,151,203)',
  backgroundColor: mainBackground,
  pageBackground,
  darkerBackground: 'rgb(22,27,27)',
  highlightedCodeLine: 'rgb(53, 59, 69)',
  error: '#eb6161',
  success: 'rgb(24, 153, 144)',
  elementBackground,
  modalBackground: 'rgb(30,35,35)',
  inputBackground: 'rgb(20,26,26)',
  inputHover: 'rgb(25, 31, 31)',
  fontColorLightGray: 'rgb(140,140,140)',
  fontColorLighterGray: 'rgb(160,160,160)',
  fontColorPrimary: 'rgba(255,255,255,0.87)',
  fontColorSecondary: 'rgba(10, 187, 181, 1)',
  fontColorTernary: '#848484',
  fontColorHeadline: '#cecece',
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
  brandGreen: 'rgb(54, 190, 190)',
  stacktapeGreen: 'rgb(54 190 190)',
  tableBoxShadow,
  vscodeBackground: '#1E1E1E',
  awsResourceCompute: 'rgb(237, 113, 0)',
  awsResourceDatabase: '#4D73F4',
  awsResourceIntegration: '#F64683',
  awsResourceSecurity: '#F34446',
  awsResourceStorage: '#5CA034',
  awsResourceNetwork: '#8E58EB'
} as const;

export const pageLayout = {
  headerHeight: 54,
  maxPageWidth: 1580
} as const;

export const fontFamilyMono = `${geistMonoFont.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
