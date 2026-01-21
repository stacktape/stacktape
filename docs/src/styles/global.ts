import { tippyTooltipStyle } from '@/components/Tooltip/tippy-styles';
import { colors, fontFamily, fontFamilyMono, onMaxW750, prettyScrollBar } from './variables';

export const typographyCss = {
  fontFamily,
  fontStyle: 'normal',
  fontWeight: 500,
  fontSize: '0.925rem',
  lineHeight: 1.9,
  color: colors.fontColorPrimary,
  [onMaxW750]: {
    fontSize: '0.85rem'
  }
};

/** Subtle grid background pattern */
const pageBackgroundPattern = {
  backgroundColor: colors.pageBackground,
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(54, 190, 190, 0.02) 3px,
      rgba(54, 190, 190, 0.02) 5px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 2px,
      rgba(54, 190, 190, 0.02) 3px,
      rgba(54, 190, 190, 0.02) 5px
    )
  `,
  backgroundAttachment: 'fixed',
  backgroundRepeat: 'repeat'
};

export const globalCss: Css = {
  ...tippyTooltipStyle,
  html: {
    scrollBehavior: 'smooth',
    scrollPaddingTop: '70px'
  },
  '*': {
    margin: '0',
    padding: '0',
    boxSizing: 'border-box',
    fontDisplay: 'swap'
  },
  'html,body': {
    overflowAnchor: 'auto',
    scrollBehavior: 'smooth',
    minWidth: '320px',
    position: 'relative',
    ...prettyScrollBar
  },
  body: {
    color: colors.brandGreen,
    ...pageBackgroundPattern,
    width: '100%'
  },
  'h1,h2,h3,h4,p,li,th,td,input,button,textarea': {
    ...typographyCss,
    fontWeight: 500
  },
  h1: {
    fontWeight: 600,
    letterSpacing: '-0.02em'
  },
  h2: {
    fontWeight: 600,
    letterSpacing: '-0.01em'
  },
  h3: {
    fontWeight: 600
  },
  h5: {
    ...typographyCss
  },
  span: {
    textRendering: 'optimizeLegibility'
  },
  a: {
    textDecoration: 'none',
    color: colors.brandGreen,
    transition: 'color 200ms ease'
  },
  'a:hover': {
    textDecoration: 'none',
    color: colors.primaryLighter
  },
  pre: {
    border: '0 !important',
    fontFamily: fontFamilyMono
  },
  code: {
    fontFamily: fontFamilyMono,
    fontSize: '0.875em',
    color: colors.brandGreen,
    background: 'linear-gradient(135deg, rgba(54, 190, 190, 0.08), rgba(54, 190, 190, 0.04))',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(54, 190, 190, 0.2)'
  },
  // Reset code styling inside pre blocks (code blocks handled by Prism)
  'pre code': {
    color: 'inherit',
    background: 'none',
    padding: 0,
    borderRadius: 0,
    border: 'none'
  },
  img: {
    padding: '10px 0px',
    maxWidth: '100%'
  },
  '.highlight-wrapper': {
    margin: '16px 0',
    padding: '14px 16px',
    borderLeft: '4px solid #ed8b00',
    color: colors.backgroundColor,
    '*': {
      color: colors.backgroundColor
    },
    code: {
      fontFamily: fontFamilyMono
    },
    backgroundColor: '#fbe9d0',
    alignItems: 'center',
    display: 'flex',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(237, 139, 0, 0.15)'
  },
  'p,li,a,th,td,input,button,textarea': typographyCss,
  '*:focus': {
    outline: 'none'
  },
  '*:focus-visible': {
    outline: 'none'
  },
  'input:-webkit-autofill': {
    WebkitTextFillColor: colors.fontColorPrimary,
    background: 'transparent'
  },
  'input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active': {
    boxShadow: `0 0 0 30px ${colors.inputBackground} inset`,
    transition: 'background-color 600000s 0s, color 600000s 0s'
  },
  'button,input': {
    backgroundColor: 'transparent',
    border: 'none'
  },
  'a,button': {
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer'
  },

  // View Transition styles for smooth page transitions
  '#main-content': {
    viewTransitionName: 'main-content'
  },

  // Fast, smooth fade transition for main content
  '::view-transition-old(main-content), ::view-transition-new(main-content)': {
    animationDuration: '200ms',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both'
  },

  // Quick fade out old content
  '::view-transition-old(main-content)': {
    animationName: 'quick-fade-out'
  },

  // Quick fade in new content
  '::view-transition-new(main-content)': {
    animationName: 'quick-fade-in'
  },

  // Loading state styles - minimal and fast
  '#main-content.view-transition-loading': {
    position: 'relative'
  },

  '#main-content.view-transition-loading::before': {
    content: "''",
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '12px',
    height: '12px',
    border: '1px solid rgba(34, 186, 181, 0.3)',
    borderTop: '1px solid rgb(34, 186, 181)',
    borderRadius: '50%',
    animation: 'loading-spinner 0.4s linear infinite',
    zIndex: 100
  },

  // Keyframe animations
  '@keyframes loading-spinner': {
    '0%': {
      transform: 'rotate(0deg)'
    },
    '100%': {
      transform: 'rotate(360deg)'
    }
  },

  '@keyframes quick-fade-out': {
    from: {
      opacity: 1
    },
    to: {
      opacity: 0
    }
  },

  '@keyframes quick-fade-in': {
    from: {
      opacity: 0
    },
    to: {
      opacity: 1
    }
  },

  // Reduce motion for users who prefer it
  '@media (prefers-reduced-motion: reduce)': {
    '::view-transition-old(main-content), ::view-transition-new(main-content)': {
      animationDuration: '150ms !important'
    },
    '#main-content.view-transition-loading::before': {
      animation: 'none',
      opacity: 0.7
    }
  }
};
