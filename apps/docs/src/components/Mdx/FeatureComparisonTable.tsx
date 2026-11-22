import { Check, Minus } from 'react-feather';

type FeatureRow = {
  name: string;
  values: Record<string, string | boolean>;
};

/** A feature matrix: one row header per feature, and readable marks with spoken names for yes and no. */
export function FeatureComparisonTable({ columns, features }: { columns: string[]; features: FeatureRow[] }) {
  return (
    <div className="docs-table-wrap">
      <table className="docs-table">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            {columns.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name}>
              <th scope="row">{feature.name}</th>
              {columns.map((col) => (
                <td key={col}>
                  <CellValue value={feature.values[col]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CellValue = ({ value }: { value: string | boolean | undefined }) => {
  if (value === true) {
    return (
      <span className="docs-mark" data-value="yes">
        <Check size={16} aria-hidden />
        <span className="sr-only-docs">Yes</span>
      </span>
    );
  }
  if (value === false || value === undefined || value === null) {
    return (
      <span className="docs-mark" data-value={value === false ? 'no' : 'none'}>
        <Minus size={16} aria-hidden />
        <span className="sr-only-docs">{value === false ? 'No' : 'Not applicable'}</span>
      </span>
    );
  }
  return <span>{value}</span>;
};
