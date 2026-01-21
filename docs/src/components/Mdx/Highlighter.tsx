import { typographyCss } from '@/styles/global';
import { colors } from '../../styles/variables';

export function Highlighter({ type, icon, props }) {
  const highlightColor = {
    warning: {
      border: colors.orange,
      background: 'rgba(237, 139, 0, 0.12)',
      font: colors.fontColorPrimary,
      iconBg: 'rgba(237, 139, 0, 0.2)'
    },
    info: {
      border: colors.blue,
      background: 'rgba(0, 102, 204, 0.12)',
      font: colors.fontColorPrimary,
      iconBg: 'rgba(0, 102, 204, 0.2)'
    },
    tip: {
      border: colors.success,
      background: 'rgba(24, 153, 144, 0.12)',
      font: colors.fontColorPrimary,
      iconBg: 'rgba(24, 153, 144, 0.2)'
    }
  }[type];

  return (
    <div
      css={{
        margin: '30px 0',
        padding: '16px 18px',
        borderLeft: `4px solid ${highlightColor.border}`,
        backgroundColor: highlightColor.background,
        alignItems: 'flex-start',
        display: 'flex',
        borderRadius: '8px',
        lineHeight: 1.6,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        css={{
          marginRight: '14px',
          marginTop: '2px',
          lineHeight: 0,
          padding: '6px',
          borderRadius: '6px',
          background: highlightColor.iconBg
        }}
      >
        {icon.render({ color: highlightColor.border, size: 20 })}
      </div>
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
