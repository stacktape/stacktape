import { border, boxShadowDark, colors } from '@/styles/variables';

export const tippyTooltipStyle: Css = {
  '.tippy-content': {
    background: `${colors.backgroundColor} !important`,
    borderRadius: '6px !important',
    '*': {
      fontSize: '0.85rem'
    },
    p: {
      lineHeight: 1.5
    },
    a: {
      fontWeight: 'bold',
      lineHeight: 1.5
    },
    code: {
      color: '#b7b7b7',
      border: '1px solid #b7b7b7',
      borderRadius: '4px',
      padding: '0px 3px'
    },
    hr: {
      margin: '4px 0px'
    },
    ul: {
      marginBottom: '10px',
      paddingLeft: '15px'
    },
    wordBreak: 'normal'
  },
  '.tippy-box': {
    backgroundColor: colors.backgroundColor,
    outline: `1px solid ${colors.borderColor} !important`,
    boxShadow: boxShadowDark,
    borderRadius: '6px !important',
    '&[data-placement^="bottom"] > .tippy-arrow::before': {
      border: `${border} !important`,
      top: '-8px !important',
      left: '-4px !important',
      width: '12px !important',
      height: '12px !important',
      transform: 'rotate(45deg) !important',
      background: colors.backgroundColor
    },
    '&[data-placement^="right"] > .tippy-arrow::before': {
      border: `${border} !important`,
      top: '7px !important',
      left: '-8px !important',
      width: '12px !important',
      height: '12px !important',
      transform: 'rotate(45deg) !important',
      background: colors.backgroundColor
    },
    '&[data-placement^="left"] > .tippy-arrow::before': {
      border: `${border} !important`,
      top: '-3px !important',
      left: '8px !important',
      width: '12px !important',
      height: '12px !important',
      transform: 'rotate(45deg) !important',
      background: colors.backgroundColor
    },
    '&[data-placement^="top"] > .tippy-arrow::before': {
      border: `${border} !important`,
      left: '5px !important',
      width: '12px !important',
      height: '12px !important',
      transform: 'rotate(45deg) !important',
      background: colors.backgroundColor
    }
  }
};
