"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { NestedDataGrid } from "@/components/NestedDataGrid";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import { formatSectorLabel } from "@/lib/categorization";
import { getAuthorDisplayName } from "@/lib/display-name";
import { HeaderNode, StatType } from "@/lib/table-headers";
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
  const [values, setValues] = useState<Record<string, string | number | null>>({});
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
          <Link href={table.deletedAt ? "/data/trash" : "/data"} className="text-muted hover:text-gray-700 dark:hover:text-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{table.title}</h1>
            {table.deletedAt && (
              <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">In Trash</span>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                {formatSectorLabel(table.sector)}
              </span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{table.subcategory}</span>
              {table.tags.map((tag) => (
                <span key={tag} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
              {table.source && <span className="text-xs text-muted">Source: {table.source}</span>}
            </div>
          </div>
          {canEdit && (
            <button onClick={handleSaveClick} disabled={saving} className="btn-primary text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save</>}
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 dark:bg-red-950/30 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-950/30 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{success}</div>}

        {table.description && (
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-sm mb-2">Description</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{table.description}</p>
          </div>
        )}

        {table.notes && (
          <div className="card p-4 mb-4 border-l-4 border-yellow-400 dark:border-yellow-600">
            <h3 className="font-semibold text-sm mb-2">Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{table.notes}</p>
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
            <p className="text-muted p-4">Legacy table format — no nested headers configured.</p>
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
        message="Provide a reason or note for this data update."
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
