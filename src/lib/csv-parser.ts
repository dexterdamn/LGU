/**
 * Parse CSV data and automatically detect headers vs data rows
 * Logic: Any rows before the first numeric value are row headers,
 * any columns before first numeric value are column headers
 */
export interface ParsedCSVData {
  rowHeaders: string[];
  colHeaders: string[];
  values: Record<string, Record<string, any>>;
}

function isNumericValue(value: any): boolean {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(value);
  return !isNaN(num) && value !== "";
}

export function parseCSV(csvContent: string): ParsedCSVData {
  const lines = csvContent.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { rowHeaders: [], colHeaders: [], values: {} };
  }

  // Parse rows
  const rows: string[][] = lines.map((line) =>
    line.split(",").map((cell) => cell.trim())
  );

  if (rows.length === 0) {
    return { rowHeaders: [], colHeaders: [], values: {} };
  }

  // Find first row with numeric data
  let firstDataRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const hasNumeric = rows[i].some((cell) => isNumericValue(cell));
    if (hasNumeric) {
      firstDataRowIdx = i;
      break;
    }
  }

  // If no numeric data found, treat all as headers
  if (firstDataRowIdx === -1) {
    firstDataRowIdx = rows.length;
  }

  // Row headers are all rows before first data row
  const rowHeaders = rows.slice(0, firstDataRowIdx).map((row) => row[0]);

  // Find first column with numeric data
  let firstDataColIdx = -1;
  for (let col = 0; col < rows[0].length; col++) {
    const hasNumeric = rows.some(
      (row) => col < row.length && isNumericValue(row[col])
    );
    if (hasNumeric) {
      firstDataColIdx = col;
      break;
    }
  }

  // If no numeric data found, treat all as headers
  if (firstDataColIdx === -1) {
    firstDataColIdx = rows[0].length;
  }

  // Column headers are first columns before first data column
  const colHeaders = rows[0].slice(0, firstDataColIdx);

  // Parse data values
  const values: Record<string, Record<string, any>> = {};

  for (let rowIdx = firstDataRowIdx; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowKey = row[0] || `row_${rowIdx}`;

    values[rowKey] = {};

    for (let colIdx = firstDataColIdx; colIdx < row.length; colIdx++) {
      const colKey = colHeaders[colIdx - firstDataColIdx] || `col_${colIdx}`;
      const cellValue = row[colIdx];
      values[rowKey][colKey] = isNumericValue(cellValue)
        ? Number(cellValue)
        : cellValue;
    }
  }

  return {
    rowHeaders,
    colHeaders,
    values,
  };
}
