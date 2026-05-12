import { colors } from '../../styles/variables';

type FeatureRow = {
  name: string;
  values: Record<string, string | boolean>;
};

export function FeatureComparisonTable({
  columns,
  features
}: {
  columns: string[];
  features: FeatureRow[];
}) {
  return (
    <div
      css={{
        margin: '25px 0 30px 0',
        overflowX: 'auto',
        borderRadius: '8px',
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}
    >
      <table
        css={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          'th, td': {
            padding: '10px 14px',
            textAlign: 'left',
            borderBottom: `1px solid rgba(255, 255, 255, 0.06)`
          },
          th: {
            fontWeight: 600,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: colors.lightGray,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            position: 'sticky',
            top: 0
          },
          'td:first-of-type': {
            fontWeight: 500,
            color: colors.fontColorPrimary
          },
          'tr:last-child td': {
            borderBottom: 'none'
          },
          'tr:hover td': {
            backgroundColor: 'rgba(255, 255, 255, 0.02)'
          }
        }}
      >
        <thead>
          <tr>
            <th>Feature</th>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name}>
              <td>{feature.name}</td>
              {columns.map((col) => {
                const value = feature.values[col];
                return (
                  <td key={col}>
                    <CellValue value={value} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CellValue = ({ value }: { value: string | boolean | undefined }) => {
  if (value === true) {
    return <span css={{ color: colors.success, fontSize: '16px' }}>&#10003;</span>;
  }
  if (value === false) {
    return <span css={{ color: '#666', fontSize: '16px' }}>&#10005;</span>;
  }
  if (value === undefined || value === null) {
    return <span css={{ color: '#555' }}>—</span>;
  }
  return <span>{value}</span>;
};
