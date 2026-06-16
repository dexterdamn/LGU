"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { NestedDataGrid } from "@/components/NestedDataGrid";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import { formatSectorLabel } from "@/lib/categorization";
import { getAuthorDisplayName } from "@/lib/display-name";
import {
  HeaderNode,
  StatType,
  flattenHeaderLeaves,
  cellKey,
  buildHeaderMatrix,
} from "@/lib/table-headers";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface DataTable {
  id: string;
  title: string;
  description: string | null;
  sector: string;
  subcategory: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  rowHeaders: HeaderNode[] | null;
  colHeaders: HeaderNode[] | null;
  showStatistics: boolean;
  statisticsTypes: string[];
  deletedAt: string | null;
  author: { id: string; name: string; nickname?: string | null };
  rows: { values: Record<string, string | number | null> }[];
}

export default function DataTablePage() {
  const params = useParams();
  const tableId = params.id as string;

  const [table, setTable] = useState<DataTable | null>(null);
  const [values, setValues] = useState<Record<string, string | number | null>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isFirstSave, setIsFirstSave] = useState(true);

  const loadTable = useCallback(async () => {
    try {
      const [tableRes, meRes] = await Promise.all([
        fetch(`/api/data/tables/${tableId}`),
        fetch("/api/auth/me"),
      ]);

      const tableData = await tableRes.json();
      const meData = await meRes.json();

      if (!tableRes.ok) throw new Error(tableData.error);

      setTable(tableData.table);
      const rowValues = tableData.table.rows[0]?.values || {};
      setValues(rowValues as Record<string, string | number | null>);
      setIsFirstSave(Object.keys(rowValues).length === 0);

      const user = meData.user;
      setCanEdit(
        !!user &&
          !tableData.table.deletedAt &&
          (user.role === "ADMIN" || user.id === tableData.table.author.id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  const handleSave = async (reason: string = "") => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/data/tables/${tableId}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Data saved successfully!");
      setShowSaveModal(false);
      setIsFirstSave(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (isFirstSave) {
      handleSave("");
    } else {
      setShowSaveModal(true);
    }
  };

  const downloadCSV = () => {
    const rowLeaves = flattenHeaderLeaves(rowHeaders);
    const colLeaves = flattenHeaderLeaves(colHeaders);
    const colMatrix = buildHeaderMatrix(colHeaders);

    const escapeCell = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const lines: string[] = [];

    // Add header matrix rows
    for (const row of colMatrix) {
      const headerRow = [
        rowHeaders.length > 0 && rowHeaders[0].label ? rowHeaders[0].label : "",
      ];
      for (const cell of row) headerRow.push(cell.label);
      lines.push(headerRow.map(escapeCell).join(","));
    }

    // Add data rows
    for (const r of rowLeaves) {
      const row = [
        r.path.join(" > "),
        ...colLeaves.map(
          (c) => values[cellKey(r.id, c.id)] ?? ""
        ),
      ];
      lines.push(row.map(escapeCell).join(","));
    }

    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(table?.title || "table").replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const rowLeaves = flattenHeaderLeaves(rowHeaders);
    const colLeaves = flattenHeaderLeaves(colHeaders);

    const rootLabel = rowHeaders.length > 0 ? rowHeaders[0].label : "";

    const escapeHtml = (s: any) => {
      const str = s === null || s === undefined ? "" : String(s);
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/\"/g, "\"")
        .replace(/'/g, "&#039;");
    };

    const styles = `
      body { font-family: Arial, sans-serif; margin: 16px; }
      h1 { margin: 0 0 12px 0; font-size: 20px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
      th { background: #f7f7f7; font-weight: 600; text-align: left; }
      .cell-alt { background: #fbfbfb; }
      @media print { .no-print { display:none; } }
    `;

    const tableHtml: string[] = [];
    tableHtml.push(`<table><thead>`);

    // Simple header: Row + all col leaf labels
    tableHtml.push(
      `<tr>` +
        `<th>${escapeHtml(rootLabel || "Row")}</th>` +
        colLeaves
          .map((c) => `<th>${escapeHtml(c.path.join(" > "))}</th>`)
          .join("") +
        `</tr>`
    );

    tableHtml.push(`</thead><tbody>`);

    rowLeaves.forEach((r) => {
      const rowLabel = r.path.join(" > ");
      tableHtml.push(
        `<tr>` +
          `<th>${escapeHtml(rowLabel)}</th>` +
          colLeaves
            .map((c, ci) => {
              const raw = values[cellKey(r.id, c.id)] ?? "";
              const cls = ci % 2 === 0 ? "" : "cell-alt";
              return `<td class="${cls}">${escapeHtml(raw)}</td>`;
            })
            .join("") +
          `</tr>`
      );
    });

    tableHtml.push(`</tbody></table>`);

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(
      `<!doctype html><html><head><title>${escapeHtml(
        table?.title || "Table"
      )}</title><meta charset="utf-8"><style>${styles}</style></head><body>`
    );
    win.document.write(`<h1>${escapeHtml(table?.title || "")}</h1>`);
    win.document.write(`${tableHtml.join("")}`);
    win.document.write(
      `<script>setTimeout(()=>{window.print();},500);</script>`
    );
    win.document.write(`</body></html>`);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="page-shell flex items-center justify-center">
        <p className="text-muted">Table not found</p>
      </div>
    );
  }

  const rowHeaders = (table.rowHeaders as HeaderNode[]) || [];
  const colHeaders = (table.colHeaders as HeaderNode[]) || [];

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={table.deletedAt ? "/data/trash" : "/data"}
            className="text-muted hover:text-gray-700 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{table.title}</h1>
            {table.deletedAt && (
              <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                In Trash
              </span>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                {formatSectorLabel(table.sector)}
              </span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {table.subcategory}
              </span>
              {table.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {table.source && (
                <span className="text-xs text-muted">Source: {table.source}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCSV} className="btn-secondary text-sm">
              Download CSV
            </button>
            <button onClick={downloadPDF} className="btn-secondary text-sm">
              Download PDF
            </button>
            {canEdit && (
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />Save
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        {table.description && (
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-sm mb-2">Description</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {table.description}
            </p>
          </div>
        )}

        {table.notes && (
          <div className="card p-4 mb-4 border-l-4 border-yellow-400 dark:border-yellow-600">
            <h3 className="font-semibold text-sm mb-2">Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {table.notes}
            </p>
          </div>
        )}

        <div className="card overflow-x-auto p-2">
          {rowHeaders.length && colHeaders.length ? (
            <NestedDataGrid
              rowHeaders={rowHeaders}
              colHeaders={colHeaders}
              values={values}
              onChange={canEdit ? setValues : undefined}
              readOnly={!canEdit}
              showStatistics={table.showStatistics}
              statisticsTypes={table.statisticsTypes as StatType[]}
            />
          ) : (
            <p className="text-muted p-4">
              Legacy table format — no nested headers configured.
            </p>
          )}
        </div>

        <p className="text-xs text-muted mt-4">
          By {getAuthorDisplayName(table.author)}
          {!canEdit && " · Read-only"}
        </p>
      </div>

      <ConfirmReasonModal
        open={showSaveModal}
        title="Save Data"
        message="" // Provide a reason or note for this data update.
        confirmLabel="Save"
        variant="primary"
        loading={saving}
        requireReason={!isFirstSave}
        onConfirm={handleSave}
        onCancel={() => setShowSaveModal(false)}
      />
    </div>
  );
}

