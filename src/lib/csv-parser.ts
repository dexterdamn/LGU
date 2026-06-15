/**
 * Parse CSV data and automatically detect headers vs data rows.
 * Supports quoted values and multi-row column headers.
 */
export interface ParsedCSVData {
  rowHeaders: string[];
  colHeaders: string[];
  values: Record<string, Record<string, any>>;
  groupBy?: string;
}

function normalizeCell(cell: string): string {
  let normalized = cell.trim();

  if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
    normalized = normalized.slice(1, -1).replace(/""/g, '"').trim();
  }

  return normalized;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(normalizeCell(current));
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(normalizeCell(current));
  return cells;
}

function isNumericValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().replace(/,/g, "");
  if (normalized === "" || normalized === "+" || normalized === "-") return false;
  const num = Number(normalized);
  return !Number.isNaN(num);
}

function parseValue(value: string): string | number {
  const normalized = normalizeCell(value);
  return isNumericValue(normalized)
    ? Number(normalized.replace(/,/g, ""))
    : normalized;
}

export function parseCSV(csvContent: string): ParsedCSVData {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.replace(/\uFEFF/g, "").trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rowHeaders: [], colHeaders: [], values: {} };
  }

  const rows = lines.map(parseCsvLine).filter((row) => row.some((cell) => cell !== ""));
  if (rows.length === 0) {
    return { rowHeaders: [], colHeaders: [], values: {} };
  }

  let firstDataRowIdx = rows.findIndex((row) => {
    const hasRowLabel = row[0]?.trim() !== "";
    const hasNumeric = row.some((cell) => isNumericValue(cell));
    return hasRowLabel && hasNumeric;
  });

  if (firstDataRowIdx === -1) {
    firstDataRowIdx = rows.length;
  }

  const dataRows = rows.slice(firstDataRowIdx);
  let firstDataColIdx = dataRows.length
    ? dataRows[0].findIndex((cell) => isNumericValue(cell))
    : rows[0].findIndex((cell) => isNumericValue(cell));

  if (firstDataColIdx === -1 && rows.length > 1) {
    firstDataColIdx = rows[1].findIndex((cell) => isNumericValue(cell));
  }

  const finalDataColIdx = firstDataColIdx === -1 ? rows[0].length : firstDataColIdx;

  const headerRows = rows.slice(0, firstDataRowIdx);
  const normalizedHeaderRows = headerRows.map((row) => {
    const normalized: string[] = [];
    let last = "";
    for (let col = 0; col < row.length; col++) {
      const cell = row[col].trim();
      if (cell === "") {
        normalized[col] = last;
      } else {
        normalized[col] = cell;
        last = cell;
      }
    }
    return normalized;
  });

  const rowHeaderTopLabels = normalizedHeaderRows[0]
    .slice(0, finalDataColIdx)
    .map((cell) => cell.trim())
    .filter(Boolean);

  const rowHeaderRows = headerRows.slice(1);
  const rowDataRows = [...rowHeaderRows, ...dataRows];

  // Parse row headers and extract path info
  const rowHeadersRaw = rowDataRows
    .map((row) => row.slice(0, finalDataColIdx).map((cell) => normalizeCell(cell)).filter(Boolean))
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const path = [...rowHeaderTopLabels, ...cells].filter(Boolean);
      return path;
    });

  // Extract group name (first element) and filter rows
  const groupBy = rowHeadersRaw.length > 0 ? rowHeadersRaw[0][0] : undefined;
  
  // Filter and process row headers
  const rowHeaders = rowHeadersRaw
    .filter(path => path.length <= 2) // Only keep items with <= 2 levels (group + item)
    .map(path => {
      // If it has 2 levels and first is same as groupBy, return only the second part
      if (path.length === 2 && path[0] === groupBy) {
        return path[1];
      }
      // Otherwise return the full path joined
      return path.join(" > ");
    });

  const maxCols = Math.max(...rows.map((row) => row.length));
  const colHeaders: string[] = [];

  for (let col = finalDataColIdx; col < maxCols; col++) {
    const headerParts = normalizedHeaderRows
      .map((row) => row[col] ?? "")
      .filter((cell) => cell.trim() !== "");

    colHeaders.push(headerParts.join(" > ") || `col_${col}`);
  }

  const values: Record<string, Record<string, any>> = {};

  for (let rowIndex = 0; rowIndex < rowDataRows.length; rowIndex++) {
    const pathArray = rowHeadersRaw[rowIndex];
    
    // Skip rows that don't fit our filter (nested items with depth > 2)
    if (!pathArray || pathArray.length > 2) {
      continue;
    }
    
    const row = rowDataRows[rowIndex];
    // Use only the second part of the path as the key if it matches groupBy pattern
    const rowKey = pathArray.length === 2 && pathArray[0] === groupBy 
      ? pathArray[1] 
      : pathArray.join(" > ");
    
    values[rowKey] = {};

    for (let colIdx = finalDataColIdx; colIdx < maxCols; colIdx++) {
      const colKey = colHeaders[colIdx - finalDataColIdx] || `col_${colIdx}`;
      if (rowIndex < rowHeaderRows.length) {
        // This row is part of the header (no data values)
        values[rowKey][colKey] = null;
      } else {
        values[rowKey][colKey] = parseValue(row[colIdx] ?? "");
      }
    }
  }

  return {
    rowHeaders,
    colHeaders,
    values,
    groupBy,
  };
}
