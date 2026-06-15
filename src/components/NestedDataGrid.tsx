"use client";

import {
  HeaderNode,
  flattenHeaderLeaves,
  buildHeaderMatrix,
  cellKey,
  computeStatistics,
  STAT_LABELS,
  StatType,
} from "@/lib/table-headers";

interface NestedDataGridProps {
  rowHeaders: HeaderNode[];
  colHeaders: HeaderNode[];
  values: Record<string, string | number | null>;
  onChange?: (values: Record<string, string | number | null>) => void;
  readOnly?: boolean;
  showStatistics?: boolean;
  statisticsTypes?: StatType[];
}

export function NestedDataGrid({
  rowHeaders,
  colHeaders,
  values,
  onChange,
  readOnly = false,
  showStatistics = false,
  statisticsTypes = [],
}: NestedDataGridProps) {
  const rowLeaves = flattenHeaderLeaves(rowHeaders);
  const colLeaves = flattenHeaderLeaves(colHeaders);
  const colMatrix = buildHeaderMatrix(colHeaders);
  const rowDepth = colMatrix.length;
  
  // Extract root header label if exists
  const rootLabel = rowHeaders.length > 0 && rowHeaders[0].label ? rowHeaders[0].label : "";

  const stats = showStatistics && statisticsTypes.length
    ? computeStatistics(values, rowLeaves, colLeaves, statisticsTypes)
    : null;

  const updateCell = (rowId: string, colId: string, val: string) => {
    if (!onChange) return;
    const key = cellKey(rowId, colId);
    const num = val === "" ? null : Number(val);
    onChange({
      ...values,
      [key]: num !== null && !Number.isNaN(num) ? num : val || null,
    });
  };

  if (!rowLeaves.length || !colLeaves.length) {
    return <p className="text-sm text-muted p-4">Configure row and column headers to generate the grid.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          {colMatrix.map((row, ri) => (
            <tr key={ri}>
              {ri === 0 && (
                <th
                  rowSpan={rowDepth + (showStatistics ? statisticsTypes.length : 0)}
                  className={ri % 2 === 0 ? "header-cell" : "header-cell-alt"}
                  style={{ minWidth: 120 }}
                >
                  {rootLabel}
                </th>
              )}
              {row.map((cell, ci) => (
                <th
                  key={ci}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={ri % 2 === 0 ? "header-cell" : "header-cell-alt"}
                >
                  {cell.label}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rowLeaves.map((row, ri) => (
            <tr key={row.id}>
              <th className={ri % 2 === 0 ? "header-cell" : "header-cell-alt"}>
                {row.path.slice(1).join(" › ")}
              </th>
              {colLeaves.map((col, ci) => {
                const key = cellKey(row.id, col.id);
                const val = values[key];
                return (
                  <td key={col.id} className={ci % 2 === 0 ? "data-cell" : "data-cell-alt"}>
                    {readOnly ? (
                      <span className="block px-2 py-1 text-sm text-left">{val ?? ""}</span>
                    ) : (
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-sm text-left bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded"
                        value={val ?? ""}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {stats &&
            statisticsTypes.map((stat, si) => (
              <tr key={stat}>
                <th className={si % 2 === 0 ? "header-cell-alt" : "header-cell"}>
                  {STAT_LABELS[stat]}
                </th>
                {colLeaves.map((col, ci) => (
                  <td key={col.id} className={`${ci % 2 === 0 ? "data-cell-alt" : "data-cell"} bg-primary-50/50 dark:bg-primary-950/20`}>
                    <span className="block px-2 py-1 text-sm text-left font-medium">
                      {stats[stat][col.id] != null
                        ? stat === "average"
                          ? stats[stat][col.id]!.toFixed(2)
                          : stats[stat][col.id]
                        : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
