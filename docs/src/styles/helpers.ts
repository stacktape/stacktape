import { keyframes } from '@emotion/react';
import { colors, onMaxW500, onMaxW1300 } from './variables';

export const container: Css = {
  padding: '0px 20px',
  [onMaxW500]: {
    padding: '0px 10px'
  }
} as const;

export const scrollbar: Css = {
  '&::-webkit-scrollbar-track': {
    height: '9px',
    width: '9px',
    backgroundColor: 'transparent'
  },
  '&::-webkit-scrollbar': {
    height: '9px',
    width: '9px',
    backgroundColor: 'transparent'
  },
  '&::-webkit-scrollbar-thumb': {
    height: '9px',
    width: '9px',
    WebkitBoxShadow: 'inset 0 0 6px rgba(0, 0, 0, 0.3)',
    borderRadius: '6px',
    backgroundColor: '#45484d'
  },
  scrollbarColor: `#45484d ${colors.backgroundColor}`,
  scrollbarWidth: 'thin'
} as const;

export const fadeInAnimation = keyframes`
from {
  opacity: 0;
}
to {
  opacity: 1;
}`;

export const scrollInAnimation = keyframes`
0%, 12.66%, 100% {
  transform: translate3d(0,0,0);
}
16.66%, 29.32% {
  transform: translate3d(0,-25%,0);
}
33.32%,45.98% {
  transform: translate3d(0,-50%,0);
}
49.98%,62.64% {
  transform: translate3d(0,-75%,0);
}
66.64%,79.3% {
  transform: translate3d(0,-50%,0);
}
83.3%,95.96% {
  transform: translate3d(0,-25%,0);
}
`;

export const bounceAnimation = keyframes`
from, 20%, 53%, 80%, to {
  transform: translate3d(0,0,0);
}
40%, 43% {
  transform: translate3d(0, -30px, 0);
}
70% {
  transform: translate3d(0, -15px, 0);
}
90% {
  transform: translate3d(0,-4px,0);
}`;

export const linearGradientBackground: Css = {
  backgroundColor: '#00828b !important',
  backgroundImage: 'linear-gradient(to right, #29a6af 0%, #0d4c3c 100%)'
} as const;

export const linearGradientBackgroundGray: Css = {
  backgroundImage: 'linear-gradient(to left top, #404040 0%, #323232 100%)',
  '&:hover': {
    backgroundImage: 'linear-gradient(to left top, #323232 0%, #323232 100%)'
  }
} as const;

export const linearGradientBackgroundDark: Css = {
  backgroundImage: 'linear-gradient(to left top, #262626 0%, #212121 100%)',
  '&:hover': {
    backgroundImage: 'linear-gradient(to left top, #212121 0%, #212121 100%)'
  }
};

export const linearGradientText: Css = {
  background: '-webkit-linear-gradient(35deg, #0aaab6 0%, #70c8b6 118.52%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
} as const;

export const linearGradientTextRed: Css = {
  background: '-webkit-linear-gradient(116.34deg, #ff9182 -44.18%, #c82b40 130.94%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
} as const;

export const glowingHoverWhite: Css = {
  '&:hover': {
    color: colors.fontColorPrimary,
    textShadow: '0px 0px 10px rgba(112, 200, 182, 0.42)'
  }
} as const;

export const glowingHover: Css = {
  '&:hover': {
    color: colors.fontColorSecondary,
    textShadow: '0px 0px 10px rgba(112, 200, 182, 0.42)'
  }
} as const;

export const glowingGradientButton: Css = {
  backgroundColor: '#00828b !important',
  backgroundImage: 'linear-gradient(to right, #00828b 0%, #56998b 40%, #00828b 100%)',
  transition: '0.5s',
  backgroundSize: '200% auto',
  borderImageSlice: '1',
  borderRadius: '6px',
  padding: '0 24px',
  height: '52px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  p: {
    margin: '0',
    textAlign: 'center',
    fontWeight: 500
  },
  '&:hover': {
    boxShadow: '0px 0px 35px -4px rgba(112, 200, 182, 0.42)'
  }
} as const;

export const pageWrapper: Css = {
  marginTop: '140px',
  padding: '10px 20px 30px 20px',
  [onMaxW1300]: {
    marginTop: '105px',
    paddingBottom: '0'
  }
} as const;

export const legalPageSectionHeader: Css = {
  marginTop: '35px',
  marginBottom: '38px'
} as const;

export const whiteBorder = `1.75px solid ${colors.fontColorPrimary}`;

export const linkCss: Css = {
  color: colors.fontColorSecondary,
  fontWeight: 'bold',
  margin: '0'
} as const;

export const lightGrayHover: Css = {
  '&:hover': {
    color: colors.lightGray,
    '*': {
      color: colors.lightGray
    }
  }
};
