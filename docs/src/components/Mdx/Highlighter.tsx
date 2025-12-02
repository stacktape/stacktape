import { typographyCss } from '@/styles/global';
import { colors } from '../../styles/variables';

export function Highlighter({ type, icon, props }) {
  const highlightColor = {
    warning: {
      border: colors.orange,
      background: colors.orangeLight,
      font: colors.black
    },
    info: {
      border: colors.blue,
      background: '#0a56a380',
      font: colors.fontColorPrimary
    },
    tip: {
      border: colors.green,
      background: colors.greenLight,
      font: colors.fontColorPrimary
    }
  }[type];

  return (
    <div
      css={{
        margin: '30px 0',
        padding: '14px',
        border: `1px solid ${highlightColor.border}`,
        borderLeft: `5px solid ${highlightColor.border}`,
        backgroundColor: highlightColor.background,
        alignItems: 'center',
        display: 'flex',
        borderRadius: '6px',
        lineHeight: 1.5,
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px'
      }}
    >
      <div css={{ marginRight: '16px', lineHeight: 0 }}>{icon.render({ color: highlightColor.border, size: 24 })}</div>
      <div
        css={{
          ...typographyCss,
          '* > .paragraph': {
            color: `${highlightColor.font} !important`
          },
          '*': {
            ...typographyCss,
            color: `${highlightColor.font} !important`
          },
          color: `${highlightColor.font} !important`,
          '.paragraph': {
            '&:first-child': {
              marginTop: 0
            },
            '&:last-child': {
              marginBottom: 0
            }
          },
          code: {
            color: `${highlightColor.font} !important`
          }
        }}
        // props}
      >
        {props.children}
      </div>
    </div>
  );
}
