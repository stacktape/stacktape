import { typographyCss } from '@/styles/global';
import { colors, fontFamilyMono } from '../../styles/variables';

export function Highlighter({ type, icon, children }: { type: string; icon: any; children: ReactNode }) {
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
        padding: '10px',
        border: `1px solid ${highlightColor.border}`,
        borderLeft: `5px solid ${highlightColor.border}`,
        backgroundColor: highlightColor.background,
        alignItems: 'center',
        display: 'flex',
        borderRadius: '4px',
        lineHeight: 1.5
      }}
    >
      <div css={{ marginRight: '12px', lineHeight: 0, width: '100%', maxWidth: '24px' }}>
        {icon.render({ color: highlightColor.border, size: 24 })}
      </div>
      <div
        css={{
          ...typographyCss,
          '* > p': {
            color: `${highlightColor.font} !important`
          },
          '*': {
            ...typographyCss,
            fontSize: `${typographyCss.fontSize} !important`,
            color: `${highlightColor.font} !important`
          },
          '* > strong': {
            ...typographyCss,
            fontWeight: '700'
          },
          color: `${highlightColor.font} !important`,
          p: {
            '&:first-child': {
              marginTop: 0
            },
            '&:last-child': {
              marginBottom: 0
            }
          },
          code: {
            fontFamily: fontFamilyMono,
            backgroundColor: colors.lightGray,
            padding: '2px 4px',
            fontSize: '0.8rem',
            borderRadius: '5px',
            border: `solid 2px ${highlightColor.border}`,
            color: `${colors.darkGrey} !important`
          }
        }}
        // props}
      >
        {children}
      </div>
    </div>
  );
}
