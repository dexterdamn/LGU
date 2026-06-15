"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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

interface RowNode {
  id: string;
  label: string;
  children?: RowNode[];
  path: string[];
}

function buildRowTree(headers: HeaderNode[]): RowNode[] {
  function convert(nodes: HeaderNode[], path: string[] = []): RowNode[] {
    return nodes.map((node) => ({
      id: node.id,
      label: node.label,
      path: [...path, node.label],
      children: node.children?.length ? convert(node.children, [...path, node.label]) : undefined,
    }));
  }
  return convert(headers);
}

function getRowLeaves(nodes: RowNode[]): RowNode[] {
  const leaves: RowNode[] = [];
  function walk(node: RowNode) {
    if (!node.children || node.children.length === 0) {
      leaves.push(node);
    } else {
      node.children.forEach(walk);
    }
  }
  nodes.forEach(walk);
  return leaves;
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const rowTree = buildRowTree(rowHeaders);
  const rowLeaves = flattenHeaderLeaves(rowHeaders);
  const colLeaves = flattenHeaderLeaves(colHeaders);
  const colMatrix = buildHeaderMatrix(colHeaders);
  const rowDepth = colMatrix.length;

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

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  function renderRowNode(node: RowNode, depth: number, index: number): React.ReactNode[] {
    const hasChildren = node.children && node.children.length > 0;
    const isLeaf = !hasChildren;
    const isExpanded = expandedRows.has(node.id);
    const rows: React.ReactNode[] = [];

    // Render current node
    rows.push(
      <tr key={`row-${node.id}`} className={index % 2 === 0 ? "" : "bg-gray-50 dark:bg-gray-900/20"}>
        <th 
          className="header-cell text-left" 
          style={{ paddingLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleRow(node.id)}
                className="p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <span>{node.label}</span>
          </div>
        </th>
        {colLeaves.map((col, ci) => {
          const key = cellKey(node.id, col.id);
          const val = values[key];
          return (
            <td key={col.id} className={ci % 2 === 0 ? "data-cell" : "data-cell-alt"}>
              {isLeaf && (
                readOnly ? (
                  <span className="block px-2 py-1 text-sm text-left">{val ?? ""}</span>
                ) : (
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-sm text-left bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded"
                    value={val ?? ""}
                    onChange={(e) => updateCell(node.id, col.id, e.target.value)}
                  />
                )
              )}
            </td>
          );
        })}
      </tr>
    );

    // Render children if expanded
    if (hasChildren && isExpanded) {
      node.children!.forEach((child, childIdx) => {
        rows.push(...renderRowNode(child, depth + 1, childIdx));
      });
    }

    return rows;
  }

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
                />
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
          {rowTree.map((node, idx) => renderRowNode(node, 0, idx))}
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
