import { typographyCss } from '@/styles/global';
import { colors } from '../../styles/variables';

export function Highlighter({ type, props }: { type: 'warning' | 'info' | 'tip' | 'error'; icon?: unknown; props: { children: any } }) {
  const highlightColor = {
    warning: {
      border: colors.orange,
      background: 'rgba(237, 139, 0, 0.12)',
      font: colors.fontColorPrimary
    },
    info: {
      border: colors.blue,
      background: 'rgba(0, 102, 204, 0.12)',
      font: colors.fontColorPrimary
    },
    tip: {
      border: colors.success,
      background: 'rgba(24, 153, 144, 0.12)',
      font: colors.fontColorPrimary
    },
    error: {
      border: '#e74c3c',
      background: 'rgba(231, 76, 60, 0.12)',
      font: colors.fontColorPrimary
    }
  }[type];

  return (
    <div
      css={{
        margin: '30px 0',
        padding: '16px 18px',
        borderLeft: `4px solid ${highlightColor.border}`,
        backgroundColor: highlightColor.background,
        alignItems: 'center',
        display: 'flex',
        borderRadius: '8px',
        lineHeight: 1.6,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        css={{
          ...typographyCss,
          flex: '1 1 auto',
          minWidth: 0,
          alignSelf: 'center',
          '* > .paragraph': {
            color: `${highlightColor.font} !important`
          },
          '*': {
            ...typographyCss,
            color: `${highlightColor.font} !important`
          },
          color: `${highlightColor.font} !important`,
          '.paragraph': {
            lineHeight: 1.55,
            '&:first-child': {
              marginTop: 0
            },
            '&:last-child': {
              marginBottom: 0
            }
          },
          code: {
            color: `${highlightColor.font} !important`,
            verticalAlign: 'baseline'
          }
        }}
        // props}
      >
        {props.children}
      </div>
    </div>
  );
}
