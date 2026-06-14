"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ConfirmReasonModal } from "@/components/ConfirmReasonModal";
import {
  DataTableFilters,
  DataTableListRow,
  useDataTableFilters,
  useFilterOptionsFromApi,
  type DataTableListItem,
} from "@/components/DataTableFilters";
import { Plus, Loader2, Trash2 } from "lucide-react";

export default function DataListPage() {
  const router = useRouter();
  const [tables, setTables] = useState<DataTableListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DataTableListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        setUserId(d.user.id);
        setUserRole(d.user.role);
        return fetch("/api/data/tables");
      })
      .then((r) => r?.json())
      .then((d) => {
        if (d) setTables(d.tables || []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data/tables/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setTables(tables.filter((t) => t.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = (table: DataTableListItem) =>
    userRole === "ADMIN" || table.author.id === userId;

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Data Entry</h1>
            <p className="text-muted">View and manage all data tables</p>
          </div>
          <Link href="/data/new" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Table
          </Link>
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

        {filtered.length ? (
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((t) => (
              <Link key={t.id} href={`/data/${t.id}`} className="block">
                <DataTableListRow
                  table={t}
                  actions={
                    canDelete(t) ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteTarget(t);
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : undefined
                  }
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center text-muted">
            <p className="text-lg">No data tables match your filters</p>
            <Link href="/data/new" className="btn-primary mt-4 inline-block">
              Create Data Table
            </Link>
          </div>
        )}
      </div>

      <ConfirmReasonModal
        open={!!deleteTarget}
        title="Move to Trash"
        message={`This will move "${deleteTarget?.title}" to trash for 15 days.`}
        confirmLabel="Move to Trash"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
