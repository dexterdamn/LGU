"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  DataTableFilters,
  useDataTableFilters,
  useFilterOptionsFromApi,
  type DataTableListItem,
} from "@/components/DataTableFilters";
import { formatSectorLabel } from "@/lib/categorization";
import { getAuthorDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/utils";
import { Database, Loader2 } from "lucide-react";

export default function BrowsePage() {
  const [tables, setTables] = useState<DataTableListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const apiOptions = useFilterOptionsFromApi();

  const {
    search, setSearch,
    authorId, setAuthorId,
    sector, setSector,
    subcategory, setSubcategory,
    tag, setTag,
    options,
    filtered,
  } = useDataTableFilters(tables);

  const mergedOptions = {
    authors: apiOptions.authors.length ? apiOptions.authors : options.authors,
    sectors: apiOptions.sectors.length ? apiOptions.sectors : options.sectors,
    subcategories: apiOptions.subcategories.length ? apiOptions.subcategories : options.subcategories,
    tags: apiOptions.tags.length ? apiOptions.tags : options.tags,
  };

  useEffect(() => {
    fetch("/api/data/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Browse Public Data</h1>
          <p className="text-muted">View all entered data tables and statistics</p>
        </div>

        <DataTableFilters
          search={search}
          onSearchChange={setSearch}
          authorId={authorId}
          onAuthorChange={setAuthorId}
          sector={sector}
          onSectorChange={setSector}
          subcategory={subcategory}
          onSubcategoryChange={setSubcategory}
          tag={tag}
          onTagChange={setTag}
          options={mergedOptions}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <Link key={t.id} href={`/data/${t.id}`} className="card p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{t.title}</h3>
                {t.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                    {formatSectorLabel(t.sector)}
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{t.subcategory}</span>
                  {t.tags.slice(0, 3).map((tg) => (
                    <span key={tg} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">{tg}</span>
                  ))}
                </div>
                <div className="text-xs text-muted flex justify-between">
                  <span>{getAuthorDisplayName(t.author)} · {t._count.rows} rows</span>
                  <span>{formatDate(t.updatedAt)}</span>
                </div>
                {t.source && <p className="text-xs text-muted mt-1">Source: {t.source}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted">
            <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No data tables found</p>
          </div>
        )}
      </div>
    </div>
  );
}
