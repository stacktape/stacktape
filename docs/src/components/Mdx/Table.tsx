import { box, colors } from '../../styles/variables';

export function Table(props) {
  return (
    <table
      css={{
        ...box,
        padding: '0',
        borderRadius: '8px',
        margin: '20px 0px 16px 0px',
        borderSpacing: '0',
        overflowWrap: 'normal',
        overflow: 'hidden',
        width: '100%',
        thead: {
          fontSize: '14px',
          color: colors.fontColorPrimary,
          background: 'rgba(0, 0, 0, 0.2)',
          tr: {
            fontWeight: 600,
            textAlign: 'left',
            th: {
              margin: '0',
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }
          }
        },
        'tbody tr': {
          margin: '0',
          padding: '0',
          transition: 'background 150ms ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.03)'
          },
          '&:not(:last-child) td': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          },
          td: {
            fontSize: '14px',
            margin: '0',
            padding: '12px 18px',
            color: colors.fontColorPrimary
          }
        }
      }}
      {...props}
    />
  );
}
