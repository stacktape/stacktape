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
    <div className="mx-0 mt-[25px] mb-[30px] overflow-x-auto rounded-[8px] border border-[rgba(255,255,255,0.1)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <table className="w-full border-collapse text-[0.875rem] [&_th]:px-[14px] [&_th]:py-[10px] [&_th]:text-left [&_th]:border-b [&_th]:border-b-[rgba(255,255,255,0.06)] [&_td]:px-[14px] [&_td]:py-[10px] [&_td]:text-left [&_td]:border-b [&_td]:border-b-[rgba(255,255,255,0.06)] [&_th]:font-semibold [&_th]:text-[12px] [&_th]:uppercase [&_th]:tracking-[0.5px] [&_th]:text-light-gray [&_th]:bg-[rgba(255,255,255,0.03)] [&_th]:sticky [&_th]:top-0 [&_td:first-of-type]:font-medium [&_td:first-of-type]:text-fc-primary [&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-[rgba(255,255,255,0.02)]">
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
    return <span className="text-success text-[16px]">&#10003;</span>;
  }
  if (value === false) {
    return <span className="text-[#666] text-[16px]">&#10005;</span>;
  }
  if (value === undefined || value === null) {
    return <span className="text-[#555]">—</span>;
  }
  return <span>{value}</span>;
};
