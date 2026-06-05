export function FinancialTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: { key: string; label: string; format?: "money" }[];
  rows: Record<string, unknown>[];
}) {
  return (
    <section className="vf-table-card">
      <h3>{title}</h3>
      <div className="vf-table-scroll">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {formatValue(row[column.key], column.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatValue(value: unknown, format?: "money") {
  if (format === "money" && typeof value === "number") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "");
}

