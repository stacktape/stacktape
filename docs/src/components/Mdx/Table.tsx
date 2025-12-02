import { box, colors } from '../../styles/variables';

export function Table(props) {
  return (
    <table
      css={{
        ...box,
        padding: '2px',
        borderRadius: '6px',
        margin: '15px 0px 12px 0px',
        borderSpacing: '0',
        overflowWrap: 'normal',
        thead: {
          fontSize: '14.5px',
          color: 'red',
          backgroundColor: colors.backgroundColor,
          tr: {
            fontWeight: 'bold',
            textAlign: 'left',
            th: { margin: '0', padding: '12px 15px 12px 15px' }
          }
        },
        'tbody tr': {
          margin: '0',
          padding: '0',
          '&:nth-child(even)': { backgroundColor: colors.backgroundColor },
          '&:nth-child(odd)': { backgroundColor: colors.darkerBackground },
          td: { fontSize: '14px', margin: '0', padding: '7px 14px' }
        },
        'th:first-child, td:first-child': { marginTop: '0' },
        'th:last-child, td:last-child': { marginBottom: '0' }
      }}
      {...props}
    />
  );
}
