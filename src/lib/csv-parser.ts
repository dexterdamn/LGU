// /**
//  * Parse CSV data and automatically detect headers vs data rows.
//  * Supports quoted values and multi-row column headers.
//  */
// export interface ParsedCSVData {
//   rowHeaders: string[];
//   colHeaders: string[];
//   values: Record<string, Record<string, any>>;
// }

// function normalizeCell(cell: string): string {
//   let normalized = cell.trim();

//   if (normalized.startsWith('"') && normalized.endsWith('"') && normalized.length >= 2) {
//     normalized = normalized.slice(1, -1).replace(/""/g, '"').trim();
//   }

//   return normalized;
// }

// function parseCsvLine(line: string): string[] {
//   const cells: string[] = [];
//   let current = "";
//   let inQuotes = false;

//   for (let i = 0; i < line.length; i++) {
//     const char = line[i];

//     if (char === '"') {
//       if (inQuotes && line[i + 1] === '"') {
//         current += '"';
//         i++;
//         continue;
//       }
//       inQuotes = !inQuotes;
//       continue;
//     }

//     if (char === "," && !inQuotes) {
//       cells.push(normalizeCell(current));
//       current = "";
//       continue;
//     }

//     current += char;
//   }

//   cells.push(normalizeCell(current));
//   return cells;
// }

// function isNumericValue(value: any): boolean {
//   if (value === null || value === undefined) return false;
//   const normalized = String(value).trim().replace(/,/g, "");
//   if (normalized === "" || normalized === "+" || normalized === "-") return false;
//   const num = Number(normalized);
//   return !Number.isNaN(num);
// }

// function parseValue(value: string): string | number {
//   const normalized = normalizeCell(value);
//   return isNumericValue(normalized)
//     ? Number(normalized.replace(/,/g, ""))
//     : normalized;
// }

// export function parseCSV(csvContent: string): ParsedCSVData {
//   const lines = csvContent
//     .split(/\r?\n/)
//     .map((line) => line.replace(/\uFEFF/g, "").trim())
//     .filter((line) => line.length > 0);

//   if (lines.length === 0) {
//     return { rowHeaders: [], colHeaders: [], values: {} };
//   }

//   const rows = lines.map(parseCsvLine).filter((row) => row.some((cell) => cell !== ""));
//   if (rows.length === 0) {
//     return { rowHeaders: [], colHeaders: [], values: {} };
//   }

//   let firstDataRowIdx = rows.findIndex((row) => {
//     const hasRowLabel = row[0]?.trim() !== "";
//     const hasNumeric = row.some((cell) => isNumericValue(cell));
//     return hasRowLabel && hasNumeric;
//   });

//   if (firstDataRowIdx === -1) {
//     firstDataRowIdx = rows.length;
//   }

//   const dataRows = rows.slice(firstDataRowIdx);
//   let firstDataColIdx = dataRows.length
//     ? dataRows[0].findIndex((cell) => isNumericValue(cell))
//     : rows[0].findIndex((cell) => isNumericValue(cell));

//   if (firstDataColIdx === -1 && rows.length > 1) {
//     firstDataColIdx = rows[1].findIndex((cell) => isNumericValue(cell));
//   }

//   const finalDataColIdx = firstDataColIdx === -1 ? rows[0].length : firstDataColIdx;

//   const headerRows = rows.slice(0, firstDataRowIdx);
//   const normalizedHeaderRows = headerRows.map((row) => {
//     const normalized: string[] = [];
//     let last = "";
//     for (let col = 0; col < row.length; col++) {
//       const cell = row[col].trim();
//       if (cell === "") {
//         normalized[col] = last;
//       } else {
//         normalized[col] = cell;
//         last = cell;
//       }
//     }
//     return normalized;
//   });

//   const rowHeaderTopLabels = normalizedHeaderRows[0]
//     .slice(0, finalDataColIdx)
//     .map((cell) => cell.trim())
//     .filter(Boolean);

//   const rowHeaderRows = headerRows.slice(1);

//   // Only create row headers from actual data rows, not from secondary header rows
//   const rowHeaders = dataRows
//     .map((row) => row.slice(0, finalDataColIdx).map((cell) => normalizeCell(cell)).filter(Boolean))
//     .filter((cells) => cells.length > 0)
//     .map((cells) => {
//       const path = [...rowHeaderTopLabels, ...cells].filter(Boolean);
//       return path.join(" > ");
//     });

//   const maxCols = Math.max(...rows.map((row) => row.length));
//   const colHeaders: string[] = [];

//   for (let col = finalDataColIdx; col < maxCols; col++) {
//     const headerParts = normalizedHeaderRows
//       .map((row) => row[col] ?? "")
//       .filter((cell) => cell.trim() !== "");

//     colHeaders.push(headerParts.join(" > ") || `col_${col}`);
//   }

//   const values: Record<string, Record<string, any>> = {};

//   for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
//     const row = dataRows[rowIndex];
//     const rowKey = rowHeaders[rowIndex] || `row_${rowIndex}`;
//     values[rowKey] = {};

//     for (let colIdx = finalDataColIdx; colIdx < maxCols; colIdx++) {
//       const colKey = colHeaders[colIdx - finalDataColIdx] || `col_${colIdx}`;
//       values[rowKey][colKey] = parseValue(row[colIdx] ?? "");
//     }
//   }

//   return {
//     rowHeaders,
//     colHeaders,
//     values,
//   };
// }


/**
 * Parse CSV data and automatically detect headers vs data rows.
 * Supports quoted values and multi-row column headers.
 */
export interface ParsedCSVData {
  rowHeaders: string[];
  colHeaders: string[];
  values: Record<string, Record<string, any>>;
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

  // Find the first data row by looking for rows with both a label and numeric values
  let firstDataRowIdx = rows.findIndex((row) => {
    const hasRowLabel = row[0]?.trim() !== "";
    const hasNumeric = row.some((cell) => isNumericValue(cell));
    return hasRowLabel && hasNumeric;
  });

  if (firstDataRowIdx === -1) {
    firstDataRowIdx = rows.length;
  }

  const dataRows = rows.slice(firstDataRowIdx);
  
  // Find the first column that contains numeric data
  let firstDataColIdx = -1;
  
  if (dataRows.length > 0) {
    firstDataColIdx = dataRows[0].findIndex((cell) => isNumericValue(cell));
  }
  
  if (firstDataColIdx === -1 && rows.length > 1) {
    // Check multiple header rows to find where numeric data starts
    for (let rowIdx = 0; rowIdx < firstDataRowIdx; rowIdx++) {
      firstDataColIdx = rows[rowIdx].findIndex((cell) => isNumericValue(cell));
      if (firstDataColIdx !== -1) break;
    }
  }

  // Make sure we capture ALL columns, not just up to first numeric
  const maxCols = Math.max(...rows.map((row) => row.length));
  const finalDataColIdx = firstDataColIdx === -1 ? 1 : firstDataColIdx;

  const headerRows = rows.slice(0, firstDataRowIdx);
  
  // Normalize header rows by carrying forward values from previous rows (for merged cells)
  const normalizedHeaderRows = headerRows.map((row) => {
    const normalized: string[] = [];
    let last = "";
    for (let col = 0; col < maxCols; col++) {
      const cell = (row[col] || "").trim();
      if (cell === "") {
        normalized[col] = last;
      } else {
        normalized[col] = cell;
        last = cell;
      }
    }
    return normalized;
  });

  // Build row headers from the first column (pre-data columns)
  const rowHeaderTopLabels = normalizedHeaderRows[0]
    .slice(0, finalDataColIdx)
    .map((cell) => cell.trim())
    .filter(Boolean);

  const rowHeaders = dataRows
    .map((row) => row.slice(0, finalDataColIdx).map((cell) => normalizeCell(cell)).filter(Boolean))
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const path = [...rowHeaderTopLabels, ...cells].filter(Boolean);
      return path.join(" > ");
    });

  // Build column headers from ALL remaining columns (including 2024!)
  const colHeaders: string[] = [];
  for (let col = finalDataColIdx; col < maxCols; col++) {
    const headerParts = normalizedHeaderRows
      .map((row) => (row[col] || "").trim())
      .filter((cell) => cell !== "");

    colHeaders.push(headerParts.join(" > ") || `col_${col}`);
  }

  // Map values from label-based structure
  const values: Record<string, Record<string, any>> = {};

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const rowKey = rowHeaders[rowIndex] || `row_${rowIndex}`;
    values[rowKey] = {};

    // Include ALL columns from finalDataColIdx to end
    for (let colIdx = finalDataColIdx; colIdx < maxCols; colIdx++) {
      const colKey = colHeaders[colIdx - finalDataColIdx] || `col_${colIdx}`;
      const cellValue = row[colIdx] ?? "";
      values[rowKey][colKey] = parseValue(cellValue);
    }
  }

  return {
    rowHeaders,
    colHeaders,
    values,
  };
}