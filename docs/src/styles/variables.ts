import { keyframes } from '@emotion/react';
import { geistFont, geistMonoFont } from '@/styles/fonts';

export const onMaxW330 = '@media (max-width: 330px)';
export const onMaxW360 = '@media (max-width: 360px)';
export const onMaxW400 = '@media (max-width: 400px)';
export const onMaxW440 = '@media (max-width: 440px)';
export const onMaxW470 = '@media (max-width: 470px)';
export const onMaxW500 = '@media (max-width: 500px)';
export const onMaxW530 = '@media (max-width: 530px)';
export const onMaxW570 = '@media (max-width: 570px)';
export const onMaxW650 = '@media (max-width: 650px)';
export const onMaxW600 = '@media (max-width: 600px)';
export const onMaxW750 = '@media (max-width: 750px)';
export const onMaxW800 = '@media (max-width: 800px)';
export const onMaxW870 = '@media (max-width: 870px)';
export const onMaxW910 = '@media (max-width: 910px)';
export const onMaxW960 = '@media (max-width: 960px)';
export const onMaxW610 = '@media (max-width: 610px)';
export const onMaxW935 = '@media (max-width: 935px)';
export const onMaxW950 = '@media (max-width: 950px)';
export const onMaxW970 = '@media (max-width: 970px)';
export const onMaxW1100 = '@media (max-width: 1100px)';
export const onMaxW1000 = '@media (max-width: 1000px)';
export const onMaxW1050 = '@media (max-width: 1050px)';
export const onMaxW1150 = '@media (max-width: 1150px)';
export const onMaxW1160 = '@media (max-width: 1160px)';
export const onMaxW1200 = '@media (max-width: 1200px)';
export const onMaxW1250 = '@media (max-width: 1250px)';
export const onMaxW1280 = '@media (max-width: 1280px)';
export const onMaxW1300 = '@media (max-width: 1300px)';
export const onMaxW1330 = '@media (max-width: 1330px)';
export const onMaxW1400 = '@media (max-width: 1400px)';
export const onMaxW1450 = '@media (max-width: 1450px)';
export const onMaxW1500 = '@media (max-width: 1500px)';
export const onMaxW1600 = '@media (max-width: 1600px)';

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

export const border = `1px solid ${colors.borderColor}`;
export const borderLight = `1px solid ${colors.borderColorLight}`;
export const thinBorder = `0.5px solid ${colors.borderColor}`;
export const thickBorder = `2px solid ${colors.borderColor}`;

export const boxShadowSmall = '2px 2px 3px rgb(26,26,26), -2px -2px 6px rgb(30,30,30)';
export const boxShadowLight = '3px 3px 5px rgb(26,26,26,1), -3px -3px 11px rgb(30,30,30)';
export const boxShadow = '4px 4px 7px rgb(22,26,26), -4px -4px 11px rgb(28,28,28)';
export const boxShadowDark = '3px 3px 5px rgb(20,20,20,1), -3px -3px 11px rgb(22,26,26)';

export const boxShadowInset = 'inset 6px 6px 6px #212121, inset -6px -6px 6px #333333';
export const boxShadowInsetLarge = 'inset 14px 14px 14px rgba(33,33,33,1), inset -14px -14px 14px rgba(59,59,59,0.75)';
export const boxShadowInsetXLarge = 'inset 20px 20px 20px rgba(33,33,33,1), inset -20px -20px 20px rgba(59,59,59,0.75)';
export const boxShadowLarge = '12px 12px 6px rgba(33,33,33,1), -11px -11px 12px rgba(56,56,56,.33)';

/** Modern glassy box style */
export const box: Css = {
  border: 'none',
  boxShadow:
    '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  background: colors.elementBackground,
  backdropFilter: 'blur(10px)'
};

/** Clickable box with hover effects */
export const clickableBoxStyle: Css = {
  background: colors.elementBackground,
  boxShadow:
    '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 250ms ease, transform 150ms ease',
  '&:hover': {
    boxShadow:
      '0 3px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 0 0 1px rgba(90, 96, 96, 0.18), inset 0 1px 0 rgba(140, 146, 146, 0.16), inset 0 0 0 1px rgba(90, 96, 96, 0.14)'
  },
  '&:active': {
    transform: 'scale(0.993)'
  }
};

/** Input box style with inset shadow */
export const inputBoxStyle: Css = {
  background: colors.inputBackground,
  border: 'none',
  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05)',
  transition: 'background 180ms ease, box-shadow 180ms ease, border 180ms ease, transform 160ms ease',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255, 255, 255, 0.07)'
  },
  ':has(input:focus), :has(textarea:focus)': {
    boxShadow:
      'inset 0 1px 4px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 3px rgba(110, 116, 116, 0.12)'
  }
};

export const clickableBox: Css = {
  ...clickableBoxStyle
};

/** Tab container style (pill-shaped background) */
export const tabContainerStyle: Css = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 6px',
  background: 'rgba(0, 0, 0, 0.25)',
  borderRadius: '10px',
  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)'
};

/** Active tab indicator style */
export const activeTabStyle: Css = {
  background: 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))',
  boxShadow:
    '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  border: 'none',
  borderRadius: '7px',
  transition: 'all 250ms ease, transform 150ms ease'
};

/** Tab button style */
export const tabButtonStyle: Css = {
  position: 'relative',
  fontSize: '13px',
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: '7px',
  color: 'rgba(190, 190, 190, 0.8)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'color 250ms ease, transform 150ms ease',
  zIndex: 1,
  outline: 'none',
  whiteSpace: 'nowrap',
  ':hover': {
    color: 'rgba(220, 220, 220, 0.95)'
  },
  ':active': {
    transform: 'scale(0.97)'
  }
};

/** Active tab button style */
export const activeTabButtonStyle: Css = {
  ...tabButtonStyle,
  color: colors.fontColorPrimary,
  background: 'linear-gradient(135deg, rgb(60, 64, 64), rgb(44, 47, 47))',
  boxShadow:
    '0 4px 12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(190, 190, 190, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  ':hover': {
    color: colors.fontColorPrimary
  }
};

export const pageLayout = {
  headerHeight: 54,
  maxPageWidth: 1580
} as const;

export const minScreenWidth = '330px';
export const maxScreenWidth = '1600px';
export const middleScreenWidth = '1000px';

export const fancyBorder: Css = {
  boxShadow,
  borderRadius: '8px',
  border: '1px solid #181818'
};

export const prettyScrollBar: Css = {
  scrollbarWidth: 'thin', // For Firefox: Thin scrollbar
  scrollbarColor: `${colors.fontColorLightGray} transparent`, // For Firefox: Red mover, transparent track
  '& ::-webkit-scrollbar': {
    width: '8px', // Width of vertical scrollbar
    height: '8px' // Height of horizontal scrollbar
  },
  '& ::-webkit-scrollbar-track': {
    backgroundColor: 'inherit', // Matches the parent's background color
    borderRadius: '10px' // Rounded corners for the track
  },
  '& ::-webkit-scrollbar-thumb': {
    backgroundColor: colors.fontColorLightGray, // Red scrollbar thumb
    borderRadius: '10px', // Rounded corners for the thumb
    border: '2px solid transparent', // Adds spacing to ensure rounding is visible
    backgroundClip: 'padding-box' // Ensures proper clipping of the rounded edges
  },
  '& ::-webkit-scrollbar-thumb:hover': {
    backgroundColor: colors.darkGrey // Darker red on hover
  },
  '& ::-webkit-scrollbar-button': {
    display: 'none' // Hides the up and down arrow buttons
  }
  // border: '1px solid #1d1d1d'
};

export const fontFamily = `${geistFont.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
export const fontFamilyMono = `${geistMonoFont.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

export const ellipsis: Css = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const growDownKeyframes = keyframes`
  0% {
      transform: scaleY(0)
  }
  100% {
      transform: scaleY(1)
  }
}`;

const appearFromTopBlurred = keyframes`
  from {
    transform: translateY(-20px);
    filter: blur(4px);
  }
  to {
    transform: translateY(0px);
    filter: blur(0px);
  }
`;

const appearFromBottomBlurred = keyframes`
  from {
    transform: translateY(20px);
    filter: blur(4px);
  }
  to {
    transform: translateY(0px);
    filter: blur(0px);
  }
`;

const appearFromLeftBlurred = keyframes`
  from {
    transform: translateX(20px);
    filter: blur(4px);
  }
  to {
    transform: translateX(0px);
    filter: blur(0px);
  }
`;

export const appearFromLeftKeyframes = keyframes`
  from {
    transform: translateX(-10px);
  }
  to {
    transform: translateX(0px);
  }
`;

const appearFromRightBlurred = keyframes`
  from {
    transform: translateX(-20px);
    filter: blur(4px);
  }
  to {
    transform: translateX(0px);
    filter: blur(0px);
  }
`;

export const appearFromTopBlurredAnimation: Css = {
  animation: `${appearFromTopBlurred} 600ms ease`
};

export const appearFromBottomBlurredAnimation: Css = {
  animation: `${appearFromBottomBlurred} 600ms ease`
};

export const appearFromLeftBlurredAnimation: Css = {
  animation: `${appearFromLeftBlurred} 600ms ease`
};

export const appearFromRightBlurredAnimation: Css = {
  animation: `${appearFromRightBlurred} 600ms ease`
};

export const growDownAnimation: Css = {
  animation: `${growDownKeyframes} 125ms ease-in-out`
};

export const chevronRightSvgBase64String =
  'PHN2Zw0KICBmaWxsPSJyZ2JhKDEwLCAxODcsIDE4MSwgMSkiDQogIGhlaWdodD0iMTRweCINCiAgd2lkdGg9IjE0cHgiDQogIHZlcnNpb249IjEuMSINCiAgc3R5bGU9Im1hcmdpbi1yaWdodDogNXB4OyINCiAgaWQ9IkxheWVyXzEiDQogIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyINCiAgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiDQogIHZpZXdCb3g9IjAgMCAzMzAgMzMwIg0KICB4bWw6c3BhY2U9InByZXNlcnZlIg0KPg0KICA8cGF0aA0KICAgIGlkPSJYTUxJRF8yMjJfIg0KICAgIGQ9Ik0yNTAuNjA2LDE1NC4zODlsLTE1MC0xNDkuOTk2Yy01Ljg1Ny01Ljg1OC0xNS4zNTUtNS44NTgtMjEuMjEzLDAuMDAxDQoJYy01Ljg1Nyw1Ljg1OC01Ljg1NywxNS4zNTUsMC4wMDEsMjEuMjEzbDEzOS4zOTMsMTM5LjM5TDc5LjM5MywzMDQuMzk0Yy01Ljg1Nyw1Ljg1OC01Ljg1NywxNS4zNTUsMC4wMDEsMjEuMjEzDQoJQzgyLjMyMiwzMjguNTM2LDg2LjE2MSwzMzAsOTAsMzMwczcuNjc4LTEuNDY0LDEwLjYwNy00LjM5NGwxNDkuOTk5LTE1MC4wMDRjMi44MTQtMi44MTMsNC4zOTQtNi42MjgsNC4zOTQtMTAuNjA2DQoJQzI1NSwxNjEuMDE4LDI1My40MiwxNTcuMjAyLDI1MC42MDYsMTU0LjM4OXoiDQogIC8+DQo8L3N2Zz4NCg==';

const appearFromTop = keyframes`
  from {
    transform: translateY(-20px);
  }
  to {
    transform: translateY(0px);
  }
`;

export const appearFromTopAnimation: Css = {
  animation: `${appearFromTop} 200ms ease-out`
};

export const interactiveBase: Css = {
  border: 'none',
  transition: 'all 250ms ease',
  cursor: 'pointer'
};

export const interactiveGlow = {
  default: {
    boxShadow:
      '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
  },
  hover: {
    boxShadow:
      '0 6px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18)'
  }
} as const;

/** Icon button styles */
export const iconButtonStyle: Css = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  display: 'flex',
  color: colors.fontColorPrimary,
  justifyContent: 'center',
  alignItems: 'center',
  userSelect: 'none',
  cursor: 'pointer',
  transition: 'all 250ms ease, transform 150ms ease',
  background: colors.elementBackground,
  boxShadow:
    '0 2px 8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  border: 'none',
  '&:hover': {
    boxShadow:
      '0 3px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 0 0 1px rgba(90, 96, 96, 0.18), inset 0 1px 0 rgba(140, 146, 146, 0.16), inset 0 0 0 1px rgba(90, 96, 96, 0.14)'
  },
  '&:active': {
    transform: 'scale(0.92)'
  }
};

/** Centered flex helper */
export const centeredFlex: Css = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center'
};
