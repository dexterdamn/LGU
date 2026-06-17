"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Combobox } from "@/components/Combobox";
import { formatSectorLabel } from "@/lib/categorization";

import { getAuthorDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/utils";

export interface DataTableListItem {
  id: string;
  title: string;
  description?: string | null;
  sector: string;
  subcategory: string;
  tags: string[];
  source?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
  author: { id: string; name: string; nickname?: string | null };
  _count: { rows: number };
}

interface FilterOptions {
  authors: { id: string; name: string }[];
  sectors: string[];
  subcategories: string[];
  tags: string[];
}

interface DataTableFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  authorId: string;
  onAuthorChange: (v: string) => void;
  sector: string;
  onSectorChange: (v: string) => void;
  subcategory: string;
  onSubcategoryChange: (v: string) => void;
  tag: string;
  onTagChange: (v: string) => void;
  options: FilterOptions;
}

export function DataTableFilters({
  search,
  onSearchChange,
  authorId,
  onAuthorChange,
  sector,
  onSectorChange,
  subcategory,
  onSubcategoryChange,
  tag,
  onTagChange,
  options,
}: DataTableFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Search title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="input w-auto min-w-[140px]"
        value={authorId}
        onChange={(e) => onAuthorChange(e.target.value)}
      >
        <option value="">All Authors</option>
        {options.authors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <div className="w-auto min-w-[180px]">
        <Combobox
          label=""
          value={sector}
          onChange={(v) => onSectorChange(v === "" ? "" : v)}
          suggestions={options.sectors}
          placeholder="All Categories"
        />
      </div>

      <div className="w-auto min-w-[180px]">
        <Combobox
          label=""
          value={subcategory}
          onChange={(v) => onSubcategoryChange(v === "" ? "" : v)}
          suggestions={options.subcategories}
          placeholder="All Subcategories"
        />
      </div>

      <select
        className="input w-auto min-w-[120px]"
        value={tag}
        onChange={(e) => onTagChange(e.target.value)}
      >
        <option value="">All Tags</option>
        {options.tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useDataTableFilters(tables: DataTableListItem[]) {
  const [search, setSearch] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [sector, setSector] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [tag, setTag] = useState("");

  const options: FilterOptions = {
    authors: [
      ...new Map(
        tables.map((t) => [t.author.id, { id: t.author.id, name: getAuthorDisplayName(t.author) }])
      ).values(),
    ],
    sectors: [...new Set(tables.map((t) => t.sector))].sort(),
    subcategories: [...new Set(tables.map((t) => t.subcategory))].sort(),
    tags: [...new Set(tables.flatMap((t) => t.tags))].sort(),
  };

  const filtered = tables.filter((t) => {
    if (authorId && t.author.id !== authorId) return false;
    if (sector && t.sector !== sector) return false;
    if (subcategory && t.subcategory !== subcategory) return false;
    if (tag && !t.tags.includes(tag)) return false;

    if (search) {
      const q = search.toLowerCase();
      const haystack = [
        t.title,
        t.description || "",
        t.source || "",
        t.sector,
        t.subcategory,
        ...t.tags,
        getAuthorDisplayName(t.author),
        formatSectorLabel(t.sector),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return {
    search,
    setSearch,
    authorId,
    setAuthorId,
    sector,
    setSector,
    subcategory,
    setSubcategory,
    tag,
    setTag,
    options,
    filtered,
  };
}

export function DataTableListRow({
  table,
  actions,
  isSelected,
  onSelectionChange,
}: {
  table: DataTableListItem;
  actions?: React.ReactNode;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
    >
      {onSelectionChange && (
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={(e) => onSelectionChange(e.target.checked)}
          className="mr-3 w-4 h-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{table.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
            {formatSectorLabel(table.sector)}
          </span>
          <span className="text-xs text-muted">{table.subcategory}</span>
          {table.tags.slice(0, 3).map((tg) => (
            <span
              key={tg}
              className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full"
            >
              {tg}
            </span>
          ))}
          <span className="text-xs text-muted">· {table._count.rows} rows · {getAuthorDisplayName(table.author)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className="text-xs text-muted">{formatDate(table.updatedAt)}</span>
        {actions}
      </div>
    </div>
  );
}

export function useFilterOptionsFromApi() {
  const [options, setOptions] = useState<FilterOptions>({
    authors: [],
    sectors: [],
    subcategories: [],
    tags: [],
  });

  useEffect(() => {
    fetch("/api/data/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d)
          setOptions({
            authors: d.authors || [],
            sectors: d.sectors || [],
            subcategories: d.subcategories || [],
            tags: d.tags || [],
          });
      })
      .catch(() => {});
  }, []);

  return options;
}

export function useTableSelection(tables: DataTableListItem[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedTables = () => {
    return tables.filter((t) => selectedIds.has(t.id));
  };

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedTables,
    selectedCount: selectedIds.size,
  };
}

