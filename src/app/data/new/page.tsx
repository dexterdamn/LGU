"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { HeaderBuilder } from "@/components/HeaderBuilder";
import { NestedDataGrid } from "@/components/NestedDataGrid";
import { Combobox } from "@/components/Combobox";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  autoDetectTags,
} from "@/lib/categorization";
import {
  HeaderNode,
  createHeaderNode,
  flattenHeaderLeaves,
  buildHeaderTreeFromPaths,
} from "@/lib/table-headers";
import { Loader2, Upload } from "lucide-react";
import type { StatType } from "@/lib/table-headers";

const STAT_OPTIONS: { value: StatType; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "average", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count" },
];

interface Template {
  id: string;
  title: string;
  sector: string;
  subcategory: string;
  description?: string;
  notes?: string;
  rowHeaders?: HeaderNode[];
  colHeaders?: HeaderNode[];
  showStatistics?: boolean;
  statisticsTypes?: StatType[];
}

export default function NewDataTablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  const [sector, setSector] = useState("");
  const [subcategory, setSubcategory] = useState("");

  const [showStatistics, setShowStatistics] = useState(false);
  const [statisticsTypes, setStatisticsTypes] = useState<StatType[]>(["total"]);

  const [rowHeaders, setRowHeaders] = useState<HeaderNode[]>([]);
  const [colHeaders, setColHeaders] = useState<HeaderNode[]>([]);

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subcategorySuggestions, setSubcategorySuggestions] = useState<string[]>([]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const [csvLoading, setCsvLoading] = useState(false);
  const [importValues, setImportValues] = useState<Record<string, string | number | null>>({});

  const [isCsvDragging, setIsCsvDragging] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
      });

    fetch("/api/data/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d?.sectors) setCategorySuggestions(d.sectors);
      });

    fetch("/api/data/templates?includePrivate=true")
      .then((r) => r.json())
      .then((d) => {
        if (d?.templates) setTemplates(d.templates);
      });
  }, [router]);

  useEffect(() => {
    const defaults = DEFAULT_SUBCATEGORIES[sector] || [];
    setSubcategorySuggestions([...new Set([...defaults])]);
  }, [sector]);

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setTitle("");
    setDescription(template.description || "");
    setSector(template.sector);
    setSubcategory(template.subcategory);
    setNotes(template.notes || "");
    setRowHeaders(template.rowHeaders || []);
    setColHeaders(template.colHeaders || []);
    setShowStatistics(template.showStatistics || false);
    setStatisticsTypes(template.statisticsTypes || ["total"]);
    setSelectedTemplate(templateId);
    setImportValues({});
  };

  const importCsvFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported");
      return;
    }

    setCsvLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/data/csv-import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const { rowHeaders: rowHdrs = [], colHeaders: colHdrs = [], values = {} } =
        result.data || {};

      const fallbackRowHdrs: string[] = (
        Array.isArray(rowHdrs) && rowHdrs.some((header: any) => String(header).trim())
      )
        ? rowHdrs
        : Object.keys(values);

      const firstRowKey = Object.keys(values)[0];
      const fallbackColHdrs: string[] = (
        Array.isArray(colHdrs) &&
        colHdrs.length > 0 &&
        colHdrs.some((header: any) => String(header).trim())
      )
        ? colHdrs
        : firstRowKey && values[firstRowKey]
          ? Object.keys(values[firstRowKey])
          : [];

      const newRowHeaders = buildHeaderTreeFromPaths(fallbackRowHdrs || []);
      const newColHeaders = buildHeaderTreeFromPaths(fallbackColHdrs || []);

      setRowHeaders(newRowHeaders.length ? newRowHeaders : [createHeaderNode("")]);
      setColHeaders(newColHeaders.length ? newColHeaders : [createHeaderNode("")]);

      if (values && Object.keys(values).length > 0) {
        const rowLeaves = flattenHeaderLeaves(newRowHeaders);
        const colLeaves = flattenHeaderLeaves(newColHeaders);

        const rowMap: Record<string, string> = {};
        rowLeaves.forEach((r) => {
          rowMap[r.path.join(" > ")] = r.id;
        });

        const colMap: Record<string, string> = {};
        colLeaves.forEach((c) => {
          colMap[c.path.join(" > ")] = c.id;
        });

        const mapped: Record<string, string | number | null> = {};
        let mappedCount = 0;

        Object.entries(values).forEach(([rKey, rowValues]) => {
          const rowId = rowMap[rKey];
          if (!rowId) return;

          if (typeof rowValues !== "object" || rowValues === null || Array.isArray(rowValues)) {
            return;
          }

          Object.entries(rowValues).forEach(([cKey, cellValue]) => {
            const colId = colMap[cKey];
            if (!colId) return;
            const cellKey = `${rowId}__${colId}`;
            mapped[cellKey] = cellValue as string | number | null;
            mappedCount++;
          });
        });

        setImportValues(mapped);

        if (mappedCount === 0) {
          setError(
            "⚠️ Warning: CSV was parsed but no data values were mapped. Check your column headers."
          );
        } else {
          setError("");
        }
      } else {
        setImportValues({});
        setError("⚠️ Warning: No data found in CSV file.");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to import CSV";
      setError(errorMsg);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importCsvFile(file);
    e.target.value = "";
  };

  const handleCsvDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (csvLoading) return;
    setIsCsvDragging(true);
  };

  const handleCsvDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (csvLoading) return;
    e.dataTransfer.dropEffect = "copy";
    setIsCsvDragging(true);
  };

  const handleCsvDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (csvLoading) return;
    setIsCsvDragging(false);
  };

  const handleCsvDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (csvLoading) return;

    setIsCsvDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    const file = files.find((f) => f.name.toLowerCase().endsWith(".csv"));
    if (!file) {
      setError("Only CSV files are supported");
      return;
    }

    await importCsvFile(file);
  };

  const detectedTags = useMemo(() => {
    const rowLabels = flattenHeaderLeaves(rowHeaders).flatMap((l) => l.path);
    const colLabels = flattenHeaderLeaves(colHeaders).flatMap((l) => l.path);
    return autoDetectTags(title, rowLabels, colLabels).tags;
  }, [title, rowHeaders, colHeaders]);

  const toggleStat = (stat: StatType) => {
    setStatisticsTypes((prev) => {
      const next = prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat];
      return next.length ? next : ["total"];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!sector.trim() || !subcategory.trim()) {
      setError("Category and subcategory are required");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    const rowLeaves = flattenHeaderLeaves(rowHeaders);
    const colLeaves = flattenHeaderLeaves(colHeaders);
    if (!rowLeaves.length || !colLeaves.length) {
      setError("Add at least one row and column header");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/data/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${title} - Template`,
          description,
          sector,
          subcategory,
          notes,
          rowHeaders,
          colHeaders,
          showStatistics,
          statisticsTypes: showStatistics ? statisticsTypes : [],
          isPublic: false,
          saveAsTemplate: true,
        }),
      });

      const res = await fetch("/api/data/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          source,
          notes,
          sector,
          subcategory,
          rowHeaders,
          colHeaders,
          showStatistics,
          statisticsTypes: showStatistics ? statisticsTypes : [],
          values: importValues,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/data/${data.table.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Create Data Table</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold">Quick Start</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Load from Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleLoadTemplate(e.target.value)}
                  className="input"
                >
                  <option value="">-- Select a template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Import CSV</label>
                <label
                  className={
                    "input-file flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer transition " +
                    (isCsvDragging
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600")
                  }
                  onDragEnter={handleCsvDragEnter}
                  onDragOver={handleCsvDragOver}
                  onDragLeave={handleCsvDragLeave}
                  onDrop={handleCsvDrop}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {csvLoading ? "Importing..." : isCsvDragging ? "Drop CSV here" : "Choose CSV file"}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    disabled={csvLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Table Title *</label>
              <input
                className="input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Population by Barangay and Sex"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the table"
              />
            </div>

            <div>
              <label className="label">Data Source</label>
              <input
                className="input"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. PSA Census 2024"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions, formula explanations, or acronym definitions"
              />
            </div>
          </div>

          <div className="card p-6 grid sm:grid-cols-2 gap-4">
            <Combobox
              label="Category *"
              value={sector}
              onChange={setSector}
              suggestions={categorySuggestions}
              placeholder="Type or select category"
              required
            />

            <Combobox
              label="Subcategory *"
              value={subcategory}
              onChange={setSubcategory}
              suggestions={subcategorySuggestions}
              placeholder="Type or select subcategory"
              required
            />

            <div className="sm:col-span-2">
              <label className="label">Auto-detected Tags</label>
              <div className="flex flex-wrap gap-2">
                {detectedTags.length ? (
                  detectedTags.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted">Tags will be auto-detected from headers and title</span>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <HeaderBuilder label="Row Headers" headers={rowHeaders} onChange={setRowHeaders} />
          </div>

          <div className="card p-6">
            <HeaderBuilder label="Column Headers" headers={colHeaders} onChange={setColHeaders} />
          </div>

          <div className="card p-6 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showStatistics}
                onChange={(e) => setShowStatistics(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Include summary statistics rows</span>
            </label>

            {showStatistics && (
              <div className="flex flex-wrap gap-2">
                {STAT_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleStat(s.value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      statisticsTypes.includes(s.value)
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold mb-4">Preview</h2>
            <NestedDataGrid
              rowHeaders={rowHeaders}
              colHeaders={colHeaders}
              values={importValues}
              readOnly
              showStatistics={showStatistics}
              statisticsTypes={statisticsTypes}
            />
          </div>

          <div className="flex gap-4">
            <Link href="/data" className="btn-secondary flex-1 py-3 text-center">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create & Enter Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

