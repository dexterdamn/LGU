"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
          placeholder="Search title, description, source..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select className="input w-auto min-w-[140px]" value={authorId} onChange={(e) => onAuthorChange(e.target.value)}>
        <option value="">All Authors</option>
        {options.authors.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select className="input w-auto min-w-[140px]" value={sector} onChange={(e) => onSectorChange(e.target.value)}>
        <option value="">All Categories</option>
        {options.sectors.map((s) => (
          <option key={s} value={s}>{formatSectorLabel(s)}</option>
        ))}
      </select>
      <select className="input w-auto min-w-[140px]" value={subcategory} onChange={(e) => onSubcategoryChange(e.target.value)}>
        <option value="">All Subcategories</option>
        {options.subcategories.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select className="input w-auto min-w-[120px]" value={tag} onChange={(e) => onTagChange(e.target.value)}>
        <option value="">All Tags</option>
        {options.tags.map((t) => (
          <option key={t} value={t}>{t}</option>
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
    authors: [...new Map(tables.map((t) => [t.author.id, { id: t.author.id, name: getAuthorDisplayName(t.author) }])).values()],
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
      const haystack = [t.title, t.description || "", t.source || ""].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return {
    search, setSearch,
    authorId, setAuthorId,
    sector, setSector,
    subcategory, setSubcategory,
    tag, setTag,
    options,
    filtered,
  };
}

export function DataTableListRow({
  table,
  actions,
}: {
  table: DataTableListItem;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{table.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
            {formatSectorLabel(table.sector)}
          </span>
          <span className="text-xs text-muted">{table.subcategory}</span>
          {table.tags.slice(0, 3).map((tg) => (
            <span key={tg} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">{tg}</span>
          ))}
          <span className="text-xs text-muted">
            · {table._count.rows} rows · {getAuthorDisplayName(table.author)}
          </span>
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
  const [options, setOptions] = useState<FilterOptions>({ authors: [], sectors: [], subcategories: [], tags: [] });

  useEffect(() => {
    fetch("/api/data/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d) setOptions({
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
