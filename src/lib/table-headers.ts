export interface HeaderNode {
  id: string;
  label: string;
  children?: HeaderNode[];
}

export interface HeaderLeaf {
  id: string;
  path: string[];
}

export function createHeaderNode(label: string, children?: HeaderNode[]): HeaderNode {
  return { id: crypto.randomUUID(), label, children };
}

export function flattenHeaderLeaves(headers: HeaderNode[]): HeaderLeaf[] {
  const leaves: HeaderLeaf[] = [];

  function walk(nodes: HeaderNode[], path: string[]) {
    for (const node of nodes) {
      const nextPath = [...path, node.label];
      if (node.children && node.children.length > 0) {
        walk(node.children, nextPath);
      } else if (node.label.trim()) {
        leaves.push({ id: node.id, path: nextPath });
      }
    }
  }

  walk(headers, []);
  return leaves;
}

export function buildHeaderTreeFromPaths(paths: string[]): HeaderNode[] {
  const roots: HeaderNode[] = [];

  for (const path of paths) {
    const parts = path
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) continue;

    let currentNodes = roots;
    let currentNode: HeaderNode | undefined;

    for (const part of parts) {
      currentNode = currentNodes.find((node) => node.label === part);
      if (!currentNode) {
        currentNode = createHeaderNode(part);
        currentNodes.push(currentNode);
      }

      if (!currentNode.children) {
        currentNode.children = [];
      }

      currentNodes = currentNode.children;
    }
  }

  return roots;
}

export function getHeaderDepth(headers: HeaderNode[]): number {
  if (!headers.length) return 0;
  return Math.max(
    ...headers.map((h) =>
      h.children && h.children.length ? 1 + getHeaderDepth(h.children) : 1
    )
  );
}

export function buildHeaderMatrix(headers: HeaderNode[]): { label: string; colSpan: number; rowSpan: number }[][] {
  const depth = Math.max(1, getHeaderDepth(headers));
  const matrix: { label: string; colSpan: number; rowSpan: number }[][] = Array.from(
    { length: depth },
    () => []
  );
  const leafCount = flattenHeaderLeaves(headers).length || 1;

  if (!headers.length) {
    matrix[0].push({ label: "", colSpan: 1, rowSpan: depth });
    return matrix;
  }

  function fill(nodes: HeaderNode[], level: number) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        const span = flattenHeaderLeaves([node]).length;
        matrix[level].push({ label: node.label, colSpan: span, rowSpan: 1 });
        fill(node.children, level + 1);
      } else {
        matrix[level].push({
          label: node.label,
          colSpan: 1,
          rowSpan: depth - level,
        });
      }
    }
  }

  fill(headers, 0);
  return matrix;
}

export function cellKey(rowId: string, colId: string): string {
  return `${rowId}__${colId}`;
}

export function parseCellKey(key: string): { rowId: string; colId: string } {
  const [rowId, colId] = key.split("__");
  return { rowId, colId };
}

export function buildEmptyGrid(rowHeaders: HeaderNode[], colHeaders: HeaderNode[]): Record<string, string | number | null> {
  const rows = flattenHeaderLeaves(rowHeaders);
  const cols = flattenHeaderLeaves(colHeaders);
  const values: Record<string, string | number | null> = {};

  for (const row of rows) {
    for (const col of cols) {
      values[cellKey(row.id, col.id)] = null;
    }
  }

  return values;
}

export type StatType = "total" | "average" | "min" | "max" | "count";

export function computeStatistics(
  values: Record<string, string | number | null>,
  rowLeaves: HeaderLeaf[],
  colLeaves: HeaderLeaf[],
  types: StatType[]
): Record<string, Record<string, number | null>> {
  const result: Record<string, Record<string, number | null>> = {};

  for (const stat of types) {
    result[stat] = {};

    for (const col of colLeaves) {
      const nums = rowLeaves
        .map((row) => values[cellKey(row.id, col.id)])
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

      if (!nums.length) {
        result[stat][col.id] = null;
        continue;
      }

      switch (stat) {
        case "total":
          result[stat][col.id] = nums.reduce((a, b) => a + b, 0);
          break;
        case "average":
          result[stat][col.id] = nums.reduce((a, b) => a + b, 0) / nums.length;
          break;
        case "min":
          result[stat][col.id] = Math.min(...nums);
          break;
        case "max":
          result[stat][col.id] = Math.max(...nums);
          break;
        case "count":
          result[stat][col.id] = nums.length;
          break;
      }
    }
  }

  return result;
}

export const STAT_LABELS: Record<StatType, string> = {
  total: "Total",
  average: "Average",
  min: "Minimum",
  max: "Maximum",
  count: "Count",
};
